"use client"

import { getStrandProfile } from "../lib/strandClassifier"
import { Q_CONFIG } from "../lib/quadrantConfig"
import { groupEntriesByDay, buildCalendarMonth } from "../lib/calendarUtils"
import DayCell from "./shared/DayCell"

// ── Stacked bar ───────────────────────────────────────────────────────
function StackedBar({ pcts, onQuadrantClick }) {
  const ORDER = ["Q1", "Q2", "Q3", "Q4"].sort((a, b) => pcts[b] - pcts[a])
  const visibleOrder = ORDER.filter(q => Math.round(pcts[q] * 100) > 0)
  const lastQ = visibleOrder[visibleOrder.length - 1]
  return (
    <div>
      <div className="flex h-8 w-full overflow-hidden rounded-md" style={{ gap: "2px" }}>
        {ORDER.map(q => {
          const c = Q_CONFIG[q]
          const pct = Math.round(pcts[q] * 100)
          if (pct === 0) return null
          const isLast = q === lastQ
          return (
            <button
              key={q}
              onClick={() => onQuadrantClick(q)}
              title={`${c.label} — ${pct}%`}
              className="flex items-center justify-center transition-opacity hover:opacity-80"
              style={{
                width: `${pct}%`,
                minWidth: pct > 0 ? "2px" : "0",
                background: c.color,
                flexShrink: 0,
              }}
            >
              {(pct >= 12 || isLast) && (
                <span className="text-xs font-medium" style={{ color: c.text }}>
                  {pct}%
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {ORDER.map(q => {
          const c = Q_CONFIG[q]
          const pct = Math.round(pcts[q] * 100)
          if (pct === 0) return null
          return (
            <button
              key={q}
              onClick={() => onQuadrantClick(q)}
              className="flex items-center gap-1.5 underline-offset-2 hover:underline"
            >
              <div className="h-2.5 w-2.5 flex-shrink-0 rounded-sm" style={{ background: c.color }} />
              <span className="text-xs font-medium" style={{ color: c.text }}>{c.label}</span>
              <span className="text-xs text-gray-400">{pct}%</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {Object.entries(Q_CONFIG).map(([key, c]) => (
        <div key={key} className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm" style={{ background: c.color }} />
          <span className="text-xs text-gray-500">{c.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-3 rounded-sm bg-gray-200" style={{ opacity: 0.5 }} />
        <span className="text-xs text-gray-500">No data</span>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────
export default function HeatmapCalendar({
  entries = [],
  filteredEntries = [],
  calendarYear,
  calendarMonth,
  onMonthChange,
  onQuadrantClick,
  onDayClick = () => {},
}) {
  const dayMap = groupEntriesByDay(entries)
  const weeks  = buildCalendarMonth(calendarYear, calendarMonth, dayMap)

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const profileResult = getStrandProfile(filteredEntries)
  const notEnoughData = profileResult.error === "not_enough_data"
  const { pcts } = notEnoughData
    ? { pcts: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 } }
    : profileResult

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Summary</h3>
      <div className="mb-6">
        <div className="mb-2 flex items-baseline justify-between" />
        {notEnoughData ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-500">
            At least 7 entries are needed to generate an affective profile.
          </div>
        ) : (
          <StackedBar pcts={pcts} onQuadrantClick={onQuadrantClick} />
        )}
      </div>

      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">Daily Entries</h3>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium uppercase tracking-wide text-gray-400">
            {d}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((slot, di) => (
              <DayCell key={di} slot={slot} onDayClick={onDayClick} />
            ))}
          </div>
        ))}
      </div>

      <Legend />
    </section>
  )
}
