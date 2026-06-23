"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"

function valenceChip(v) {
  if (v > 0) return "border-green-200 bg-green-50 text-green-700"
  if (v < 0) return "border-red-200 bg-red-50 text-red-700"
  return "border-gray-200 bg-gray-50 text-gray-600"
}

function SectionLabel({ children }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
      {children}
    </p>
  )
}

function EmptyNote() {
  return <span className="text-sm text-gray-400">None detected</span>
}

export default function JournalNoteForm() {
  const router = useRouter()
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState(null)

  async function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed) return
    setLoading(true)
    setError("")

    // Explicitly get the current session so we can attach the token.
    // supabase.functions.invoke doesn't always auto-attach it in Next.js.
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError("You need to be logged in to save a note.")
      setLoading(false)
      return
    }

    const { data, error } = await supabase.functions.invoke("extract-journal", {
      body: { text: trimmed },
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    setLoading(false)
    if (error) {
      setError("Couldn't analyze that note. Please try again.")
      return
    }
    setResult(data.extracted)
  }

  function handleWriteAnother() {
    setText("")
    setResult(null)
    setError("")
  }

  if (result) {
    return (
      <div className="space-y-5">
        <div>
          <SectionLabel>Summary</SectionLabel>
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
            {result.summary}
          </p>
        </div>

        <div>
          <SectionLabel>People</SectionLabel>
          {result.people.length === 0 ? (
            <EmptyNote />
          ) : (
            <div className="flex flex-wrap gap-2">
              {result.people.map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700"
                >
                  {p.name}
                  {p.roles.length > 0 && (
                    <span className="text-xs text-gray-400">
                      {p.roles.join(", ")}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionLabel>Actions</SectionLabel>
          {result.actions.length === 0 ? (
            <EmptyNote />
          ) : (
            <div className="flex flex-wrap gap-2">
              {result.actions.map((a, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700"
                >
                  {a.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionLabel>Emotions</SectionLabel>
          {result.emotions.length === 0 ? (
            <EmptyNote />
          ) : (
            <div className="flex flex-wrap gap-2">
              {result.emotions.map((em, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${valenceChip(em.valence)}`}
                >
                  {em.name}
                  {em.toward_person && (
                    <span className="text-xs opacity-70">→ {em.toward_person}</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleWriteAnother}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Write another
          </button>
          <button
            onClick={() => router.push("/explore/days")}
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What happened today? Who was there, what did you do, how did it feel?"
          rows={8}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
        />
      </div>

      <div>
        <button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Analyzing…" : "Analyze & Save"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}
