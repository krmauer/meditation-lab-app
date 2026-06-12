// supabase/functions/extract-journal/index.ts
//
// One server-side endpoint that does the whole loop:
//   journal text  ->  Claude Sonnet (structured extraction)  ->  create_journal_entry RPC
//
// Runs on Supabase (Deno), NOT in the browser, so the Anthropic key is never
// exposed. The same endpoint serves both the web dashboard and the mobile app.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  EXTRACTION_PROMPT_VERSION,
  EXTRACTION_TOOL,
  STATIC_SYSTEM_PROMPT,
  buildEntityContext,
} from "./extractionPrompt.ts";

// --- Secrets (set with: supabase secrets set ...). Never hard-code these. ---
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// --- CORS: lets your browser app call this function. ---
const cors = {
  "Access-Control-Allow-Origin": "*", // tighten to your domain in production
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Browsers send a preflight OPTIONS request first; answer it and stop.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    // --- 1. Identify the user from their login token. ---
    // We forward their JWT, so every DB read/write runs AS them and RLS applies.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return json({ error: "Invalid or expired session" }, 401);
    }

    // --- 2. Read the journal text from the request body. ---
    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return json({ error: "Journal text is required" }, 400);
    }

    // --- 3. Fetch this user's recent entities so the model reuses existing names. ---
    // (Runs under their JWT, so RLS scopes it to their own records.)
    const [pp, aa, ee] = await Promise.all([
      supabase.from("people").select("name").is("deleted_at", null)
        .order("last_seen_at", { ascending: false }).limit(50),
      supabase.from("actions").select("name").is("deleted_at", null)
        .order("last_seen_at", { ascending: false }).limit(50),
      supabase.from("emotions").select("name").is("deleted_at", null)
        .order("last_seen_at", { ascending: false }).limit(50),
    ]);
    const existing = {
      people: pp.data ?? [],
      actions: aa.data ?? [],
      emotions: ee.data ?? [],
    };

    // --- 4. Ask Claude to extract, forcing it to use our schema. ---
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        temperature: 0, // deterministic: same entry -> same extraction
        // System is TWO blocks: the big static prompt (cached, so repeat calls
        // are cheap) plus the small per-user entity list (changes every time).
        system: [
          {
            type: "text",
            text: STATIC_SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
          { type: "text", text: buildEntityContext(existing) },
        ],
        messages: [{ role: "user", content: text }],
        tools: [EXTRACTION_TOOL],
        // "Required" + a named tool = Claude MUST answer in our schema's shape.
        tool_choice: { type: "tool", name: EXTRACTION_TOOL.name },
      }),
    });

    if (!claudeRes.ok) {
      const detail = await claudeRes.text();
      return json({ error: "Extraction failed", detail }, 502);
    }

    const claudeData = await claudeRes.json();

    console.log("cache stats:", {
      cache_creation: claudeData.usage?.cache_creation_input_tokens,
      cache_read: claudeData.usage?.cache_read_input_tokens,
      input: claudeData.usage?.input_tokens,
    });

    // Find the tool_use block and read its .input — clean, schema-shaped JSON.
    const toolBlock = claudeData.content?.find(
      (b: { type: string; name?: string }) =>
        b.type === "tool_use" && b.name === EXTRACTION_TOOL.name,
    );
    if (!toolBlock) {
      return json({ error: "No structured output returned" }, 502);
    }
    const extracted = toolBlock.input as {
      summary: string;
      people: { name: string; roles: string[] }[];
      actions: { name: string }[];
      emotions: { name: string; valence: number; toward_person: string | null }[];
    };

    // --- 5. Write everything in one atomic call to create_journal_entry. ---
    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      "create_journal_entry",
      {
        p_text: text,
        p_summary: extracted.summary,
        p_people: extracted.people,
        p_actions: extracted.actions,
        p_emotions: extracted.emotions,
        p_prompt_version: EXTRACTION_PROMPT_VERSION,
      },
    );

    if (rpcErr) {
      return json({ error: "Database write failed", detail: rpcErr.message }, 500);
    }

    // --- 6. Hand the structured result back to the client. ---
    return json({ entry: rpcData, extracted }, 200);
  } catch (err) {
    return json({ error: "Unexpected error", detail: String(err) }, 500);
  }
});

// Small helper so every response carries the CORS headers and JSON type.
function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}
