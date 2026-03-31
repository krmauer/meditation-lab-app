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
    <section style={{ marginTop: "2rem", marginBottom: "2rem" }}>
      <h2>Complete PANAS Assessment</h2>
      <p>Rate each feeling from 1 to 5.</p>
      <p style={{ marginTop: "-0.5rem", color: "#555" }}>
        1 = very slightly or not at all, 5 = extremely
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>
            Timeframe
          </label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            style={{ padding: "0.5rem", width: "100%", maxWidth: "300px" }}
          >
            <option value="right_now">Right now</option>
            <option value="today">Today</option>
            <option value="past_few_days">Past few days</option>
            <option value="past_week">Past week</option>
            <option value="general">In general</option>
          </select>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            rows={4}
            style={{
              padding: "0.5rem",
              width: "100%",
              maxWidth: "600px",
              fontFamily: "Arial, sans-serif",
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "2rem",
            alignItems: "start",
          }}
        >
          {itemsByColumn.map((column, columnIndex) => (
            <div key={columnIndex}>
              {column.map((item) => (
                <div key={item.key} style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.25rem" }}>
                    {item.label}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={scores[item.key]}
                    onChange={(e) => updateScore(item.key, e.target.value)}
                    style={{ padding: "0.5rem", width: "100px" }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: "0.6rem 1rem", cursor: "pointer" }}
        >
          {loading ? "Saving..." : "Save PANAS Assessment"}
        </button>
      </form>

      {message && (
        <p style={{ color: "green", marginTop: "1rem" }}>{message}</p>
      )}
      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}
    </section>
  )
}