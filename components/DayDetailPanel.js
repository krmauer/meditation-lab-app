"use client"

import { Q_CONFIG } from "../lib/quadrantConfig"
import { classifyDay } from "../lib/strandClassifier"

const QUADRANT_PHRASES = {
  Q1: "High energy and low friction.",
  Q2: "High tension and low fuel.",
  Q3: "High energy and high tension.",
  Q4: "Low tension and low drive.",
}

const POSITIVE_ITEMS = [
  { key: "active",      label: "Active" },
  { key: "alert",       label: "Alert" },
  { key: "attentive",   label: "Attentive" },
  { key: "determined",  label: "Determined" },
  { key: "inspired",    label: "Inspired" },
]

const NEGATIVE_ITEMS = [
  { key: "afraid",   label: "Afraid" },
  { key: "ashamed",  label: "Ashamed" },
  { key: "hostile",  label: "Hostile" },
  { key: "nervous",  label: "Nervous" },
  { key: "upset",    label: "Upset" },
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

function formatDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

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
              style={{
                background: n <= value ? color : "#E5E7EB",
              }}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400 w-28">{SCALE_LABELS[value]}</span>
      </div>
    </div>
  )
}

export default function DayDetailPanel({ dateKey, entries = [], onClose }) {
  if (!dateKey) return null

  const dayEntries = entries.filter((entry) => {
    const d = new Date(entry.created_at)
    const key = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-")
    return key === dateKey
  })

  const avgPA = dayEntries.length
    ? Math.round((dayEntries.reduce((sum, e) => sum + (e.positive_avg ?? 0), 0) / dayEntries.length) * 10) / 10
    : null
  const avgNA = dayEntries.length
    ? Math.round((dayEntries.reduce((sum, e) => sum + (e.negative_avg ?? 0), 0) / dayEntries.length) * 10) / 10
    : null
  const quadrant = avgPA !== null && avgNA !== null ? classifyDay(avgPA, avgNA) : null
  const qConfig = quadrant ? Q_CONFIG[quadrant] : null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-2xl rounded-t-2xl bg-white shadow-2xl"
        style={{ maxHeight: "85vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-start justify-between rounded-t-2xl px-5 py-4"
          style={{
            background: qConfig ? qConfig.color : "#F9FAFB",
            borderBottom: `2px solid ${qConfig ? qConfig.border : "#E5E7EB"}`,
          }}
        >
          <div>
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: qConfig ? qConfig.text : "#6B7280" }}
            >
              {qConfig ? qConfig.label : "No data"}
            </p>
            {quadrant && (
              <p className="mt-0.5 text-sm font-medium" style={{ color: qConfig.text }}>
                {QUADRANT_PHRASES[quadrant]}
              </p>
            )}
            <h2 className="mt-0.5 text-lg font-semibold text-gray-900">
              {formatDateKey(dateKey)}
            </h2>
            {avgPA !== null && (
              <p className="mt-1 text-sm text-gray-600">
                PA avg: <span className="font-medium">{avgPA}</span>
                &nbsp;·&nbsp;
                NA avg: <span className="font-medium">{avgNA}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/60 text-gray-500 hover:bg-white hover:text-gray-900 transition"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-6">
          {dayEntries.length === 0 ? (
            <p className="text-sm text-gray-500">No entries found for this day.</p>
          ) : (
            dayEntries.map((entry, i) => (
              <div key={entry.id}>
                {dayEntries.length > 1 && (
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
                      <ScoreRow
                        key={item.key}
                        label={item.label}
                        value={entry[item.key] ?? 1}
                        color="#16a34a"
                      />
                    ))}
                  </div>
                  <div className="mt-4 sm:mt-0">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Negative</p>
                    {NEGATIVE_ITEMS.map((item) => (
                      <ScoreRow
                        key={item.key}
                        label={item.label}
                        value={entry[item.key] ?? 1}
                        color="#dc2626"
                      />
                    ))}
                  </div>
                </div>

                {entry.notes && (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Notes</p>
                    <p className="text-sm text-gray-700">{entry.notes}</p>
                  </div>
                )}

                {i < dayEntries.length - 1 && (
                  <div className="mt-6 border-t border-gray-200" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
