"use client"

import { useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

const POSITIVE_ITEMS = [
  { key: "active", label: "Active" },
  { key: "alert", label: "Alert" },
  { key: "attentive", label: "Attentive" },
  { key: "determined", label: "Determined" },
  { key: "inspired", label: "Inspired" },
]

const NEGATIVE_ITEMS = [
  { key: "afraid", label: "Afraid" },
  { key: "ashamed", label: "Ashamed" },
  { key: "hostile", label: "Hostile" },
  { key: "nervous", label: "Nervous" },
  { key: "upset", label: "Upset" },
]

const PANAS_ITEMS = [...POSITIVE_ITEMS, ...NEGATIVE_ITEMS]

const INITIAL_SCORES = PANAS_ITEMS.reduce((acc, item) => {
  acc[item.key] = 1
  return acc
}, {})

const SCALE_LABELS = [
  "Slightly / None",
  "A little",
  "Moderately",
  "Quite a bit",
  "Extremely",
]

function RatingRow({ label, value, onChange }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((option, index) => {
          const active = value === option

          return (
            <div key={option} className="flex flex-col items-center gap-1" style={{ width: "4rem" }}>
              <span
                className="text-center text-[10px] leading-tight text-gray-400 whitespace-pre-line flex items-end justify-center"
                style={{ height: "2.5rem" }}
              >
                {SCALE_LABELS[index]}
              </span>
              <button
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
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NotesCard({ id, label, value, onChange, placeholder }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <label
        htmlFor={id}
        className="mb-3 block text-sm font-medium text-gray-900"
      >
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
      />
    </div>
  )
}

export default function PanasForm({ onSuccess }) {
  const [timeframe, setTimeframe] = useState("right_now")
  const [positiveNotes, setPositiveNotes] = useState("")
  const [negativeNotes, setNegativeNotes] = useState("")
  const [scores, setScores] = useState(INITIAL_SCORES)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const itemsByColumn = useMemo(() => {
    return [POSITIVE_ITEMS, NEGATIVE_ITEMS]
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
      setError("You must be logged in to save an I-PANAS-SF assessment.")
      setLoading(false)
      return
    }

    const payload = {
      user_id: user.id,
      timeframe,
      positive_notes: positiveNotes.trim() || null,
      negative_notes: negativeNotes.trim() || null,
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

    setMessage("I-PANAS-SF assessment saved.")
    setTimeframe("right_now")
    setPositiveNotes("")
    setNegativeNotes("")
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
          Complete I-PANAS-SF Assessment
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Rate each feeling from 1 to 5.
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

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          <div className="space-y-4">
            {itemsByColumn[0].map((item) => (
              <RatingRow
                key={item.key}
                label={item.label}
                value={scores[item.key]}
                onChange={(value) => updateScore(item.key, value)}
              />
            ))}

            <NotesCard
              id="positiveNotes"
              label="Positive Notes"
              value={positiveNotes}
              onChange={setPositiveNotes}
              placeholder="Optional notes about positive emotions, events, or experiences"
            />
          </div>

          <div className="space-y-4">
            {itemsByColumn[1].map((item) => (
              <RatingRow
                key={item.key}
                label={item.label}
                value={scores[item.key]}
                onChange={(value) => updateScore(item.key, value)}
              />
            ))}

            <NotesCard
              id="negativeNotes"
              label="Negative Notes"
              value={negativeNotes}
              onChange={setNegativeNotes}
              placeholder="Optional notes about negative emotions, events, or experiences"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save I-PANAS-SF Assessment"}
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