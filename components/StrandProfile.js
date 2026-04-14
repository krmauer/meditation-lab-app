"use client"

import { getStrandProfile } from "../lib/strandClassifier"
import { Q_CONFIG } from "../lib/quadrantConfig"

const PERIOD_OPTIONS = [
  { value: "today",      label: "Today" },
  { value: "yesterday",  label: "Yesterday" },
  { value: "this_week",  label: "This Week" },
  { value: "last_week",  label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_year",  label: "This Year" },
  { value: "last_year",  label: "Last Year" },
  { value: "all_time",   label: "All Time" },
]

// ── Stacked bar ───────────────────────────────────────────────────────
function StackedBar({ pcts, onQuadrantClick }) {
  const ORDER = ["Q1", "Q2", "Q3", "Q4"].sort((a, b) => pcts[b] - pcts[a])
  return (
    <div>
      {/* The bar itself */}
      <div className="flex h-8 w-full overflow-hidden rounded-md" style={{ gap: "2px" }}>
        {ORDER.map(q => {
          const c   = Q_CONFIG[q]
          const pct = Math.round(pcts[q] * 100)
          if (pct === 0) return null
          return (
            <button
              key={q}
              onClick={() => onQuadrantClick(q)}
              title={`${c.label} — ${pct}%`}
              className="flex items-center justify-center transition-opacity hover:opacity-80"
              style={{
                width:      `${pct}%`,
                minWidth:   pct > 0 ? "2px" : "0",
                background: c.color,
                flexShrink: 0,
              }}
            >
              {pct >= 12 && (
                <span className="text-xs font-medium" style={{ color: c.text }}>
                  {pct}%
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {ORDER.map(q => {
          const c   = Q_CONFIG[q]
          const pct = Math.round(pcts[q] * 100)
          if (pct === 0) return null
          return (
            <button
              key={q}
              onClick={() => onQuadrantClick(q)}
              className="flex items-center gap-1.5 underline-offset-2 hover:underline"
            >
              <div
                className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                style={{ background: c.color }}
              />
              <span className="text-xs font-medium" style={{ color: c.text }}>
                {c.label}
              </span>
              <span className="text-xs text-gray-400">{pct}%</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────
export default function StrandProfile({
  entries = [],
  selectedPeriod = "this_week",
  onPeriodChange,
  onQuadrantClick,
}) {
  const result       = getStrandProfile(entries)
  const notEnoughData = result.error === "not_enough_data"
  const { pcts, n }  = notEnoughData
    ? { pcts: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }, n: 0 }
    : result

  return (
    <section>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Affective Profile</h2>
          {!notEnoughData && (
            <p className="mt-0.5 text-sm text-gray-500">
              Based on {n} entries
            </p>
          )}
        </div>
        <select
          value={selectedPeriod}
          onChange={(e) => onPeriodChange(e.target.value)}
          className="self-start rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-gray-400 focus:outline-none"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {notEnoughData ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          At least 7 entries are needed to generate an affective profile.
        </div>
      ) : (
        <StackedBar pcts={pcts} onQuadrantClick={onQuadrantClick} />
      )}
    </section>
  )
}
