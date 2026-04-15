"use client"

import { classifyDay } from "../lib/strandClassifier"
import { Q_CONFIG } from "../lib/quadrantConfig"

function ScoreRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-700 w-28">{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className="h-3 w-3 rounded-full"
              style={{ background: n <= value ? color : "#E5E7EB" }}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400 w-28">{SCALE_LABELS[value]}</span>
      </div>
    </div>
  )
}

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
      dayMap[key] = { positiveSum: 0, negativeSum: 0, count: 0, notes: [], entries: [] }
    }

    dayMap[key].positiveSum += entry.positive_avg
    dayMap[key].negativeSum += entry.negative_avg
    dayMap[key].count += 1
    dayMap[key].entries.push(entry)

    if (entry.notes && entry.notes.trim()) {
      dayMap[key].notes.push(entry.notes.trim())
    }
  }

  return Object.entries(dayMap).map(([dateKey, { positiveSum, negativeSum, count, notes, entries: rawEntries }]) => {
    const pa = Math.round((positiveSum / count) * 10) / 10
    const na = Math.round((negativeSum / count) * 10) / 10
    return { dateKey, pa, na, quadrant: classifyDay(pa, na), notes, entries: rawEntries }
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

const POSITIVE_ITEMS = [
  { key: "active",     label: "Active" },
  { key: "alert",      label: "Alert" },
  { key: "attentive",  label: "Attentive" },
  { key: "determined", label: "Determined" },
  { key: "inspired",   label: "Inspired" },
]

const NEGATIVE_ITEMS = [
  { key: "afraid",  label: "Afraid" },
  { key: "ashamed", label: "Ashamed" },
  { key: "hostile", label: "Hostile" },
  { key: "nervous", label: "Nervous" },
  { key: "upset",   label: "Upset" },
]

const SCALE_LABELS = {
  1: "Slightly / None",
  2: "A little",
  3: "Moderately",
  4: "Quite a bit",
  5: "Extremely",
}

const TIMEFRAME_LABELS = {
  right_now:     "Right now",
  today:         "Today",
  past_few_days: "Past few days",
  past_week:     "Past week",
  general:       "In general",
}

const QUADRANT_PHRASES = {
  Q1: "High energy and low friction.",
  Q2: "High tension and low fuel.",
  Q3: "High energy and high tension.",
  Q4: "Low tension and low drive.",
}

// ── Main export ───────────────────────────────────────────────────────
export default function TopDayCard({ entries = [], monthLabel = "this month" }) {
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
          className="rounded-xl overflow-hidden"
          style={{ border: `1.5px solid ${c.border}` }}
        >
          {/* Header — same style as DayDetailPanel */}
          <div
            className="px-5 py-4"
            style={{
              background: c.color,
              borderBottom: `2px solid ${c.border}`,
            }}
          >
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: c.text }}>
              {c.label}
            </p>
            <p className="mt-0.5 text-sm font-medium" style={{ color: c.text }}>
              {QUADRANT_PHRASES["Q1"]}
            </p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {formatDateKey(topDay.dateKey)}
            </p>
            <p className="mt-1 text-sm" style={{ color: c.text, opacity: 0.8 }}>
              PA avg: {topDay.pa} · NA avg: {topDay.na}
            </p>
          </div>

          {/* Entry detail — rendered for each entry that day */}
          <div className="bg-white px-5 py-4 space-y-6">
            {topDay.entries.map((entry, i) => (
              <div key={entry.id}>
                {topDay.entries.length > 1 && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Entry {i + 1} · {new Date(entry.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                )}

                {entry.timeframe && (
                  <p className="mb-3 text-sm text-gray-500">
                    Timeframe: <span className="font-medium text-gray-700">{TIMEFRAME_LABELS[entry.timeframe] ?? entry.timeframe}</span>
                  </p>
                )}

                <div className="grid gap-x-6 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Positive</p>
                    {POSITIVE_ITEMS.map((item) => (
                      <ScoreRow key={item.key} label={item.label} value={entry[item.key] ?? 1} color="#16a34a" />
                    ))}
                  </div>
                  <div className="mt-4 sm:mt-0">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Negative</p>
                    {NEGATIVE_ITEMS.map((item) => (
                      <ScoreRow key={item.key} label={item.label} value={entry[item.key] ?? 1} color="#dc2626" />
                    ))}
                  </div>
                </div>

                {entry.notes && (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Notes</p>
                    <p className="text-sm text-gray-700">{entry.notes}</p>
                  </div>
                )}

                {i < topDay.entries.length - 1 && (
                  <div className="mt-6 border-t border-gray-100" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
