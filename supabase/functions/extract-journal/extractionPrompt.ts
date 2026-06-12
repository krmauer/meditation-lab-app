// extractionPrompt.ts
//
// The "brain" of the extraction step: the instructions and the output contract
// that turn freeform journal text into structured people / actions / emotions.
//
// ⚠️ VERSIONED ARTIFACT. Every entry records which version processed it
// (journal_entries.prompt_version). If you change the rules, examples, or
// schema below, BUMP EXTRACTION_PROMPT_VERSION so you can tell old extractions
// from new ones. Treat edits like code changes, not tweaks.

export const EXTRACTION_PROMPT_VERSION = "v1.0";

// ---------------------------------------------------------------------
// THE OUTPUT CONTRACT (the "tool")
// We hand this schema to Claude and force it to fill the schema in, so the
// reply is always shaped exactly like our database expects. The field names
// and shapes here must match what create_journal_entry() consumes.
// ---------------------------------------------------------------------
export const EXTRACTION_TOOL = {
  name: "save_extracted_entities",
  description:
    "Record the structured people, actions, and emotions found in one journal entry.",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "One neutral sentence (~10–20 words) describing the entry.",
      },
      people: {
        type: "array",
        description: "Each distinct NAMED person. Never invent a name from a pronoun.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Canonical name, Title Case." },
            roles: {
              type: "array",
              description:
                "This person's role IN THIS ENTRY (not their relationship to you).",
              items: {
                type: "string",
                enum: ["companion", "target", "mentioned"],
              },
            },
          },
          required: ["name", "roles"],
        },
      },
      actions: {
        type: "array",
        description: "Concrete things done or that happened.",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Short lowercase verb phrase, e.g. 'have lunch', 'walk'.",
            },
          },
          required: ["name"],
        },
      },
      emotions: {
        type: "array",
        description: "Emotions the writer expressed or felt.",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Single lowercase feeling word, e.g. 'anxious', 'grateful'.",
            },
            valence: {
              type: "number",
              description: "-1.0 (very negative) to 1.0 (very positive).",
            },
            toward_person: {
              type: ["string", "null"],
              description:
                "If the emotion is directed at someone, their exact name from the people list; else null.",
            },
          },
          required: ["name", "valence", "toward_person"],
        },
      },
    },
    required: ["summary", "people", "actions", "emotions"],
  },
};

// ---------------------------------------------------------------------
// THE STATIC PROMPT
// This block never changes between calls, which is what makes it cacheable
// (cheap to reuse). The per-user "known entities" list is added separately.
// ---------------------------------------------------------------------
export const STATIC_SYSTEM_PROMPT = `You extract structured data from a person's private journal entries. Your output powers a tool that helps them see patterns between what happens in their life and how they feel. Accuracy and restraint matter more than completeness: it is far better to omit something uncertain than to invent something that isn't there.

You will always respond by calling the save_extracted_entities tool. Never reply in prose.

# What to extract

PEOPLE — distinct, NAMED individuals.
  - A person must have a name. If the writer refers to someone only as "she", "he", "they", "my boss" with no name given (and no match in the known-entities list), do NOT create a person. A nameless person cannot be tracked over time.
  - Assign each person one or more ROLES describing their part IN THIS ENTRY:
      • "companion"  — they were present / with the writer during what happened.
      • "target"     — an emotion or action is directed at or about them.
      • "mentioned"  — referenced, but not present and not the focus.
    A person can hold several roles at once (e.g. a friend you argued with is both "companion" and "target"). If genuinely unclear, use "mentioned".
  - Note: roles describe this entry, NOT the durable relationship (friend, coworker). Do not put relationship types in roles.

ACTIONS — concrete things done or that happened.
  - Short lowercase verb phrases: "have lunch", "go for a run", "argue", "miss a deadline".
  - Not full sentences, not vague states. "felt tired" is an emotion, not an action.

EMOTIONS — feelings the writer expressed.
  - A single lowercase feeling word: "anxious", "grateful", "drained", "content".
  - valence: a number from -1.0 (very negative) to 1.0 (very positive).
  - toward_person: if the feeling is clearly aimed at one named person, give that exact name; otherwise null.

# Decision rules

1. Extract only what the text supports. Never add people, actions, or emotions that aren't there.
2. No name, no person. Pronoun-only references are dropped.
3. REUSE known entities. If something in the entry matches, or is a clear variant of, a name in the "Known entities" list, output the EXISTING spelling exactly (e.g. entry says "Mike", known list has "Michael" → output "Michael"). This keeps one real person from splitting into several records.
4. Keep names canonical: people in Title Case, actions and emotions lowercase.
5. Always produce a one-sentence summary, even for thin entries.

# Examples

Entry: "Frustrating walk with Jim this morning. He kept bringing up the thing from last week and I just wanted to enjoy the trail. Felt my chest tightening the whole time."
→ {
  "summary": "Tense morning walk with Jim; lingering frustration and anxiety.",
  "people": [{ "name": "Jim", "roles": ["companion", "target"] }],
  "actions": [{ "name": "walk" }],
  "emotions": [
    { "name": "frustrated", "valence": -0.7, "toward_person": "Jim" },
    { "name": "anxious", "valence": -0.5, "toward_person": null }
  ]
}

Entry: "meh."
→ {
  "summary": "Brief entry with no specific content.",
  "people": [],
  "actions": [],
  "emotions": []
}

Entry: "Cooked dinner alone tonight, felt unexpectedly peaceful. Music on, no rush."
→ {
  "summary": "Peaceful solo cooking evening.",
  "people": [],
  "actions": [{ "name": "cook dinner" }],
  "emotions": [{ "name": "peaceful", "valence": 0.6, "toward_person": null }]
}

Entry: "She was being weird again. I don't know what to do. Felt drained after."
→ {
  "summary": "Unsettling interaction with an unnamed person; left feeling drained.",
  "people": [],
  "actions": [],
  "emotions": [{ "name": "drained", "valence": -0.5, "toward_person": null }]
}
(Note: "she" has no name, so no person is created — even though someone is clearly involved.)`;

// ---------------------------------------------------------------------
// THE DYNAMIC PART
// Builds the short "known entities" section from the user's recent records,
// so the model normalizes to names that already exist. Kept separate from the
// static prompt above so the static part stays identical (and cacheable).
// ---------------------------------------------------------------------
type EntityList = {
  people: { name: string }[];
  actions: { name: string }[];
  emotions: { name: string }[];
};

export function buildEntityContext(existing: EntityList): string {
  const line = (items: { name: string }[]) =>
    items.length ? items.map((i) => i.name).join(", ") : "(none yet)";

  return `# Known entities (reuse these exact names when they match)
People: ${line(existing.people)}
Actions: ${line(existing.actions)}
Emotions: ${line(existing.emotions)}`;
}
