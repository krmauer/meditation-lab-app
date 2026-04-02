"use client"

import { useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

const PANAS_ITEMS = [
  { key: "interested", label: "Interested" },
  { key: "distressed", label: "Distressed" },
  { key: "excited", label: "Excited" },
  { key: "upset", label: "Upset" },
  { key: "strong", label: "Strong" },
  { key: "guilty", label: "Guilty" },
  { key: "scared", label: "Scared" },
  { key: "hostile", label: "Hostile" },
  { key: "enthusiastic", label: "Enthusiastic" },
  { key: "proud", label: "Proud" },
  { key: "irritable", label: "Irritable" },
  { key: "alert", label: "Alert" },
  { key: "ashamed", label: "Ashamed" },
  { key: "inspired", label: "Inspired" },
  { key: "nervous", label: "Nervous" },
  { key: "determined", label: "Determined" },
  { key: "attentive", label: "Attentive" },
  { key: "jittery", label: "Jittery" },
  { key: "active", label: "Active" },
  { key: "afraid", label: "Afraid" },
]

const INITIAL_SCORES = PANAS_ITEMS.reduce((acc, item) => {
  acc[item.key] = 1
  return acc
}, {})

function RatingRow({ label, value, onChange }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-900">{label}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((option) => {
          const active = value === option

          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition ${
                active
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function PanasForm({ onSuccess }) {
  const [timeframe, setTimeframe] = useState("right_now")
  const [notes, setNotes] = useState("")
  const [scores, setScores] = useState(INITIAL_SCORES)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const itemsByColumn = useMemo(() => {
    const midpoint = Math.ceil(PANAS_ITEMS.length / 2)
    return [PANAS_ITEMS.slice(0, midpoint), PANAS_ITEMS.slice(midpoint)]
  }, [])

  function updateScore(key, value) {
    const numericValue = Number(value)

    setScores((prev) => ({
      ...prev,
      [key]: Number.isNaN(numericValue)
        ? 1
        : Math.min(5, Math.max(1, numericValue)),
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError("You must be logged in to save a PANAS assessment.")
      setLoading(false)
      return
    }

    const payload = {
      user_id: user.id,
      timeframe,
      notes: notes.trim() || null,
      ...scores,
    }

    const { error: insertError } = await supabase
      .from("panas_entries")
      .insert([payload])

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setMessage("PANAS assessment saved.")
    setTimeframe("right_now")
    setNotes("")
    setScores(INITIAL_SCORES)
    setLoading(false)

    if (onSuccess) {
      onSuccess()
    }
  }

  return (
    <section>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-gray-900">
          Complete PANAS Assessment
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Rate each feeling from 1 to 5.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          1 = very slightly or not at all, 5 = extremely
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="timeframe"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Timeframe
          </label>
          <select
            id="timeframe"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
          >
            <option value="right_now">Right now</option>
            <option value="today">Today</option>
            <option value="past_few_days">Past few days</option>
            <option value="past_week">Past week</option>
            <option value="general">In general</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="notes"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            rows={4}
            className="w-full max-w-2xl rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          {itemsByColumn.map((column, columnIndex) => (
            <div key={columnIndex} className="space-y-4">
              {column.map((item) => (
                <RatingRow
                  key={item.key}
                  label={item.label}
                  value={scores[item.key]}
                  onChange={(value) => updateScore(item.key, value)}
                />
              ))}
            </div>
          ))}
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save PANAS Assessment"}
          </button>
        </div>
      </form>

      {message && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </section>
  )
}