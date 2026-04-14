"use client"

import { useState } from "react"
import { classifyDay, getStrandProfile } from "../lib/strandClassifier"
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
      dayMap[key] = { positiveSum: 0, negativeSum: 0, count: 0 }
    }
    dayMap[key].positiveSum += entry.positive_avg
    dayMap[key].negativeSum += entry.negative_avg
    dayMap[key].count += 1
  }
  const result = {}
  for (const [key, { positiveSum, negativeSum, count }] of Object.entries(dayMap)) {
    result[key] = {
      pa: Math.round((positiveSum / count) * 10) / 10,
      na: Math.round((negativeSum / count) * 10) / 10,
    }
  }
  return result
}

// ── Calendar grid builder ─────────────────────────────────────────────
function buildCalendarMonth(year, month, dayMap) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const weeks = []
  let currentWeek = []
  for (let i = 0; i < firstDayOfWeek; i++) currentWeek.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = [
      year,
      String(month + 1).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-")
    const data = dayMap[dateKey] || null
    const quadrant = data ? classifyDay(data.pa, data.na) : null
    currentWeek.push({ dateKey, dayNumber: day, pa: data?.pa ?? null, na: data?.na ?? null, quadrant })
    if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = [] }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }
  return weeks
}

// ── Day cell ──────────────────────────────────────────────────────────
function DayCell({ slot }) {
  const [hovered, setHovered] = useState(false)
  if (!slot) return <div className="aspect-square" />
  const { dayNumber, quadrant, pa, na, dateKey } = slot
  const hasData = quadrant !== null
  const config = hasData ? Q_CONFIG[quadrant] : null
  return (
    <div
      className="relative aspect-square"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex h-full w-full cursor-default items-center justify-center rounded-sm text-xl font-semibold transition-opacity"
        style={{
          background: hasData ? config.color : "#E5E5E3",
          color: hasData ? "#fff" : "#9CA3AF",
          opacity: hasData ? 1 : 0.5,
        }}
      >
        {dayNumber}
      </div>
      {hovered && hasData && (
        <div
          className="absolute bottom-full left-1/2 z-10 mb-1.5 w-36 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs shadow-md"
          style={{ borderTop: `3px solid ${config.color}` }}
        >
          <p className="font-semibold" style={{ color: config.text }}>{config.label}</p>
          <p className="mt-0.5 text-gray-400">{dateKey}</p>
          <div className="mt-1.5 space-y-0.5 text-gray-600">
            <p>PA avg: <span className="font-medium text-gray-800">{pa}</span></p>
            <p>NA avg: <span className="font-medium text-gray-800">{na}</span></p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Stacked bar ───────────────────────────────────────────────────────
function StackedBar({ pcts, onQuadrantClick }) {
  const ORDER = ["Q1", "Q2", "Q3", "Q4"].sort((a, b) => pcts[b] - pcts[a])
  return (
    <div>
      <div className="flex h-8 w-full overflow-hidden rounded-md" style={{ gap: "2px" }}>
        {ORDER.map(q => {
          const c = Q_CONFIG[q]
          const pct = Math.round(pcts[q] * 100)
          if (pct === 0) return null
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
              {pct >= 12 && (
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
}) {
  const dayMap = groupEntriesByDay(entries)
  const weeks  = buildCalendarMonth(calendarYear, calendarMonth, dayMap)

  const monthLabel = new Date(calendarYear, calendarMonth, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  function goBack() {
    if (calendarMonth === 0) onMonthChange(calendarYear - 1, 11)
    else onMonthChange(calendarYear, calendarMonth - 1)
  }

  function goForward() {
    if (calendarMonth === 11) onMonthChange(calendarYear + 1, 0)
    else onMonthChange(calendarYear, calendarMonth + 1)
  }

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  // Affective profile for the displayed month
  const profileResult = getStrandProfile(filteredEntries)
  const notEnoughData = profileResult.error === "not_enough_data"
  const { pcts, n } = notEnoughData
    ? { pcts: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }, n: 0 }
    : profileResult

  return (
    <section>
      {/* Header row: title left, month navigation right */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Mood Calendar</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Each day coloured by its affective quadrant.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
          >
            ‹
          </button>
          <span className="min-w-[130px] text-center text-sm font-medium text-gray-700">
            {monthLabel}
          </span>
          <button
            onClick={goForward}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
          >
            ›
          </button>
        </div>
      </div>

      {/* Affective profile bar — summary of this month */}
      <div className="mb-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Affective Profile</h3>
          {!notEnoughData && (
            <span className="text-xs text-gray-400">Based on {n} entries</span>
          )}
        </div>
        {notEnoughData ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-500">
            At least 7 entries are needed to generate an affective profile.
          </div>
        ) : (
          <StackedBar pcts={pcts} onQuadrantClick={onQuadrantClick} />
        )}
      </div>

      {/* Divider */}
      <div className="mb-5 border-t border-gray-100" />

      {/* Day-of-week column headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium uppercase tracking-wide text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((slot, di) => (
              <DayCell key={di} slot={slot} />
            ))}
          </div>
        ))}
      </div>

      <Legend />
    </section>
  )
}
