"use client"

import { classifyDay } from "../lib/strandClassifier"
import { Q_CONFIG } from "../lib/quadrantConfig"

// ── Day aggregation ───────────────────────────────────────────────────
function groupEntriesByDay(entries) {
  const dayMap = {}

  for (const entry of entries) {
    if (entry.positive_avg == null || entry.negative_avg == null) continue

    const date = new Date(entry.created_at)
    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-")

    if (!dayMap[key]) {
      dayMap[key] = { positiveSum: 0, negativeSum: 0, count: 0, notes: [] }
    }

    dayMap[key].positiveSum += entry.positive_avg
    dayMap[key].negativeSum += entry.negative_avg
    dayMap[key].count += 1

    if (entry.notes && entry.notes.trim()) {
      dayMap[key].notes.push(entry.notes.trim())
    }
  }

  return Object.entries(dayMap).map(([dateKey, { positiveSum, negativeSum, count, notes }]) => {
    const pa = Math.round((positiveSum / count) * 10) / 10
    const na = Math.round((negativeSum / count) * 10) / 10
    return { dateKey, pa, na, quadrant: classifyDay(pa, na), notes }
  })
}

// ── Top day finder ────────────────────────────────────────────────────
function findTopDay(entries) {
  const days = groupEntriesByDay(entries)
  const flourishingDays = days.filter(d => d.quadrant === "Q1")
  if (flourishingDays.length === 0) return null
  return flourishingDays.reduce((best, day) => {
    return (day.pa - day.na) > (best.pa - best.na) ? day : best
  })
}

// ── Helper: format date key for display ──────────────────────────────
function formatDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })
}

// ── Main export ───────────────────────────────────────────────────────
export default function TopDayCard({ entries = [], monthLabel = "this month", onQuadrantClick }) {
  const topDay = findTopDay(entries)
  const c = Q_CONFIG["Q1"]

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Top Day</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Best flourishing day in {monthLabel}, by PA − NA score.
        </p>
      </div>

      {!topDay ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6">
          <p className="text-sm font-medium text-gray-600">
            No flourishing days in {monthLabel}.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            A flourishing day requires a positive affect average of 3.5 or above
            and a negative affect average below 2.2. Try navigating to another
            month, or keep logging — patterns emerge over time.
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg p-4"
          style={{ background: c.bg, border: `1.5px solid ${c.border}` }}
        >
          <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold" style={{ color: c.text }}>
              {formatDateKey(topDay.dateKey)}
            </p>
            <button
              onClick={() => onQuadrantClick("Q1")}
              className="self-start rounded-full px-2.5 py-0.5 text-xs font-medium underline-offset-2 hover:opacity-80 sm:self-auto"
              style={{ background: c.color, color: "#fff" }}
            >
              {c.label}
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-4">
            <div>
              <p className="text-xs text-gray-500">Positive avg</p>
              <p className="text-lg font-semibold" style={{ color: c.text }}>{topDay.pa}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Negative avg</p>
              <p className="text-lg font-semibold" style={{ color: c.text }}>{topDay.na}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">PA − NA</p>
              <p className="text-lg font-semibold" style={{ color: c.text }}>
                {Math.round((topDay.pa - topDay.na) * 10) / 10}
              </p>
            </div>
          </div>

          {topDay.notes.length > 0 && (
            <div
              className="rounded-md px-3 py-2.5"
              style={{ background: "#fff", border: `1px solid ${c.border}`, opacity: 0.85 }}
            >
              <p className="mb-1 text-xs font-medium uppercase tracking-wide" style={{ color: c.text }}>
                Notes
              </p>
              {topDay.notes.map((note, i) => (
                <p key={i} className="text-sm text-gray-700">{note}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
