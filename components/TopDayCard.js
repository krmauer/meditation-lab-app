"use client"

import { useState } from "react"
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

function DayCell({ slot, onDayClick }) {
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
        className={`flex h-full w-full items-center justify-center rounded-sm text-xl font-semibold transition-opacity ${hasData ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
        style={{
          background: hasData ? config.color : "#E5E5E3",
          color: hasData ? "#fff" : "#9CA3AF",
          opacity: hasData ? 1 : 0.5,
        }}
        onClick={() => hasData && onDayClick(dateKey)}
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

  const result = {}
  for (const [key, { positiveSum, negativeSum, count, notes, entries: rawEntries }] of Object.entries(dayMap)) {
    const pa = Math.round((positiveSum / count) * 10) / 10
    const na = Math.round((negativeSum / count) * 10) / 10
    result[key] = { pa, na, quadrant: classifyDay(pa, na), notes, entries: rawEntries }
  }
  return result
}

// ── Top day finder ────────────────────────────────────────────────────
function findTopDay(entries) {
  const dayMap = groupEntriesByDay(entries)
  const flourishingDays = Object.entries(dayMap)
    .filter(([, d]) => d.quadrant === "Q1")
    .map(([dateKey, d]) => ({ dateKey, ...d }))
  if (flourishingDays.length === 0) return null
  return flourishingDays.reduce((best, day) => {
    return (day.pa - day.na) > (best.pa - best.na) ? day : best
  })
}

// ── Week helpers ──────────────────────────────────────────────────────
function findTopWeek(entries) {
  const dayMap = groupEntriesByDay(entries)
  const weekMap = {}

  for (const [dateKey, { pa, na }] of Object.entries(dayMap)) {
    const [year, month, day] = dateKey.split("-").map(Number)
    const d = new Date(year, month - 1, day)
    const sunday = new Date(d)
    sunday.setDate(d.getDate() - d.getDay())
    const weekKey = [
      sunday.getFullYear(),
      String(sunday.getMonth() + 1).padStart(2, "0"),
      String(sunday.getDate()).padStart(2, "0"),
    ].join("-")
    if (!weekMap[weekKey]) weekMap[weekKey] = []
    weekMap[weekKey].push({ pa, na })
  }

  let best = null
  for (const [weekKey, days] of Object.entries(weekMap)) {
    const score = days.reduce((sum, d) => sum + (d.pa - d.na), 0) / days.length
    if (!best || score > best.score) best = { weekKey, score, days }
  }
  return best
}

function buildWeekCells(weekKey, dayMap) {
  const [year, month, day] = weekKey.split("-").map(Number)
  const sunday = new Date(year, month - 1, day)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    const dateKey = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-")
    const data = dayMap[dateKey] || null
    return {
      dateKey,
      dayNumber: d.getDate(),
      pa: data?.pa ?? null,
      na: data?.na ?? null,
      quadrant: data ? classifyDay(data.pa, data.na) : null,
    }
  })
}

// ── Month helpers ─────────────────────────────────────────────────────
function findTopMonth(entries) {
  const dayMap = groupEntriesByDay(entries)
  const monthMap = {}

  for (const [dateKey, { pa, na }] of Object.entries(dayMap)) {
    const [year, month] = dateKey.split("-").map(Number)
    const monthKey = `${year}-${String(month).padStart(2, "0")}`
    if (!monthMap[monthKey]) monthMap[monthKey] = []
    monthMap[monthKey].push({ pa, na })
  }

  let best = null
  for (const [monthKey, days] of Object.entries(monthMap)) {
    const score = days.reduce((sum, d) => sum + (d.pa - d.na), 0) / days.length
    if (!best || score > best.score) best = { monthKey, score }
  }
  return best
}

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

// ── Helper: format date key for display ──────────────────────────────
function formatDateKey(dateKey, short = false) {
  const [year, month, day] = dateKey.split("-").map(Number)
  if (short) {
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      month: "short", day: "numeric",
    })
  }
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

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function CalendarLegend() {
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
export default function TopDayCard({ entries = [] }) {
  const topDay = findTopDay(entries)
  const c = Q_CONFIG["Q1"]

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Top Day</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Best flourishing day, all time · by PA − NA score.
        </p>
      </div>

      {!topDay ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6">
          <p className="text-sm font-medium text-gray-600">
            No flourishing days on record yet.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            A flourishing day requires PA avg ≥ 2.5 and NA avg below 2.5.
            Keep logging — patterns emerge over time.
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

export function TopWeekCard({ entries = [] }) {
  const topWeek = findTopWeek(entries)

  if (!topWeek) {
    return (
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Top week</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Best 7-day window, all time · Sun – Sat calendar weeks.
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6">
          <p className="text-sm font-medium text-gray-600">No data yet.</p>
          <p className="mt-1 text-sm text-gray-400">Keep logging — your best week will appear here.</p>
        </div>
      </section>
    )
  }

  const dayMap = groupEntriesByDay(entries)
  const cells = buildWeekCells(topWeek.weekKey, dayMap)

  // Build the date range label: "Apr 7 – Apr 13, 2025"
  const firstCell = cells[0]
  const lastCell = cells[6]
  const [wy] = topWeek.weekKey.split("-").map(Number)
  const rangeLabel = `${formatDateKey(firstCell.dateKey, true)} – ${formatDateKey(lastCell.dateKey, true)}, ${wy}`

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Top week</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Best 7-day window, all time · {rangeLabel}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
        {/* Day-of-week headers */}
        <div className="mb-1 grid grid-cols-7 gap-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[10px] font-medium uppercase tracking-wide text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* Single row of 7 cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((slot, i) => (
            <DayCell key={i} slot={slot} onDayClick={() => {}} />
          ))}
        </div>

        <CalendarLegend />
      </div>
    </section>
  )
}

export function TopMonthCard({ entries = [] }) {
  const topMonth = findTopMonth(entries)

  if (!topMonth) {
    return (
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Top month</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Best calendar month, all time.
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6">
          <p className="text-sm font-medium text-gray-600">No data yet.</p>
          <p className="mt-1 text-sm text-gray-400">Keep logging — your best month will appear here.</p>
        </div>
      </section>
    )
  }

  const [yearNum, monthNum] = topMonth.monthKey.split("-").map(Number)
  const monthLabel = new Date(yearNum, monthNum - 1, 1).toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  })

  const dayMap = groupEntriesByDay(entries)
  const weeks = buildCalendarMonth(yearNum, monthNum - 1, dayMap)

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Top month</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Best calendar month, all time · {monthLabel}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
        {/* Month label — no navigation */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700">{monthLabel}</p>
        </div>

        {/* Day-of-week headers */}
        <div className="mb-1 grid grid-cols-7 gap-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[10px] font-medium uppercase tracking-wide text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid — all weeks of the month */}
        <div className="space-y-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((slot, di) => (
                <DayCell key={di} slot={slot} onDayClick={() => {}} />
              ))}
            </div>
          ))}
        </div>

        <CalendarLegend />
      </div>
    </section>
  )
}
