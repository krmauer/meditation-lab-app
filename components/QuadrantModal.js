"use client"

import { useEffect } from "react"
import { Q_CONFIG } from "../lib/quadrantConfig"
import { classifyDay } from "../lib/strandClassifier"

const QUADRANT_PHRASES = {
  Q1: "High energy and low friction.",
  Q2: "High tension and low fuel.",
  Q3: "High energy and high tension.",
  Q4: "Low tension and low drive.",
}

// One-line descriptions for each quadrant
const DESCRIPTIONS = {
  Q1: { subtitle: "High positive affect · Low negative affect" },
  Q2: { subtitle: "Low positive affect · High negative affect" },
  Q3: { subtitle: "High positive affect · High negative affect" },
  Q4: { subtitle: "Low positive affect · Low negative affect" },
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

// Converts a dateKey like "2025-03-14" into "Friday, March 14, 2025"
function formatDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
    year:    "numeric",
  })
}

// Groups raw entries into day objects, filtering to only the target quadrant.
// Returns an array of { dateKey, entries[] } sorted newest first.
function groupEntriesByDay(entries, targetQuadrant) {
  const dayMap = {}

  for (const entry of entries) {
    if (entry.positive_avg == null || entry.negative_avg == null) continue

    const d = new Date(entry.created_at)
    const key = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-")

    if (!dayMap[key]) {
      dayMap[key] = { entries: [], paSum: 0, naSum: 0, count: 0 }
    }

    dayMap[key].entries.push(entry)
    dayMap[key].paSum += entry.positive_avg
    dayMap[key].naSum += entry.negative_avg
    dayMap[key].count += 1
  }

  // Filter to days whose average falls in the target quadrant
  return Object.entries(dayMap)
    .filter(([, { paSum, naSum, count }]) => {
      const pa = paSum / count
      const na = naSum / count
      return classifyDay(pa, na) === targetQuadrant
    })
    .sort(([a], [b]) => b.localeCompare(a)) // newest first
    .map(([dateKey, { entries }]) => ({ dateKey, entries }))
}

// A single score row: label + filled dots + text label
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

// A single entry card — same layout as DayDetailPanel
function EntryCard({ entry, index, total }) {
  return (
    <div>
      {total > 1 && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Entry {index + 1} · {new Date(entry.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
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
    </div>
  )
}

// A single day block — date header + one or more entry cards
function DayBlock({ dateKey, entries }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-gray-700">{formatDateKey(dateKey)}</p>
      {entries.map((entry, i) => (
        <div key={entry.id}>
          <EntryCard entry={entry} index={i} total={entries.length} />
          {i < entries.length - 1 && <div className="my-4 border-t border-gray-100" />}
        </div>
      ))}
    </div>
  )
}

export default function QuadrantModal({ quadrant, entries = [], onClose }) {
  // Close on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  if (!quadrant) return null

  const c    = Q_CONFIG[quadrant]
  const info = DESCRIPTIONS[quadrant]
  const days = groupEntriesByDay(entries, quadrant)

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 overflow-hidden"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-xl bg-gray-50 shadow-xl mb-12 flex flex-col"
        style={{ borderTop: `4px solid ${c.color}`, maxHeight: "85vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 transition hover:text-gray-600"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Header — full-width colored background, matching DayDetailPanel style */}
        <div
          className="flex items-start justify-between rounded-t-xl px-5 py-4"
          style={{
            background: c.color,
            borderBottom: `2px solid ${c.border}`,
          }}
        >
          <div>
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: c.text }}
            >
              {c.label}
            </p>
            <p
              className="mt-0.5 text-sm font-medium"
              style={{ color: c.text }}
            >
              {QUADRANT_PHRASES[quadrant]}
            </p>
            <p className="mt-1 text-xs" style={{ color: c.text, opacity: 0.7 }}>
              {info.subtitle}
            </p>
          </div>
        </div>

        {/* Entry cards */}
        <div className="px-6 pb-6 space-y-4 overflow-y-auto flex-1">
          {days.length === 0 ? (
            <p className="text-sm text-gray-400">No entries for this quadrant in the selected period.</p>
          ) : (
            days.map(({ dateKey, entries: dayEntries }) => (
              <DayBlock key={dateKey} dateKey={dateKey} entries={dayEntries} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
