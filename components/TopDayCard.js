"use client"

import { classifyDay } from "../lib/strandClassifier"
import { Q_CONFIG } from "../lib/quadrantConfig"
import { groupEntriesByDay, buildCalendarMonth } from "../lib/calendarUtils"
import ScoreRow from "./shared/ScoreRow"
import DayCell from "./shared/DayCell"

// ── Top day finder ────────────────────────────────────────────────────
export function findTopDay(entries) {
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
export function findTopWeek(entries) {
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
export function findTopMonth(entries) {
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

// ── Shared display constants ──────────────────────────────────────────
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

// ── TopDayCard ────────────────────────────────────────────────────────
export default function TopDayCard({ entries = [] }) {
  const topDay = findTopDay(entries)
  const c = Q_CONFIG["Q1"]

  return (
    <section>
      {!topDay ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6">
          <p className="text-sm font-medium text-gray-600">No flourishing days on record yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            A flourishing day requires PA avg ≥ 2.5 and NA avg below 2.5. Keep logging — patterns emerge over time.
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${c.border}` }}>
          <div
            className="px-5 py-4"
            style={{ background: c.color, borderBottom: `2px solid ${c.border}` }}
          >
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: c.text }}>{c.label}</p>
            <p className="mt-0.5 text-sm font-medium" style={{ color: c.text }}>{QUADRANT_PHRASES["Q1"]}</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{formatDateKey(topDay.dateKey)}</p>
            <p className="mt-1 text-sm" style={{ color: c.text, opacity: 0.8 }}>
              PA avg: {topDay.pa} · NA avg: {topDay.na}
            </p>
          </div>
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
                {i < topDay.entries.length - 1 && <div className="mt-6 border-t border-gray-100" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

// ── TopWeekCard ───────────────────────────────────────────────────────
export function TopWeekCard({ entries = [] }) {
  const topWeek = findTopWeek(entries)

  if (!topWeek) {
    return (
      <section>
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6">
          <p className="text-sm font-medium text-gray-600">No data yet.</p>
          <p className="mt-1 text-sm text-gray-400">Keep logging — your best week will appear here.</p>
        </div>
      </section>
    )
  }

  const dayMap = groupEntriesByDay(entries)
  const cells = buildWeekCells(topWeek.weekKey, dayMap)
  const [wy] = topWeek.weekKey.split("-").map(Number)
  const rangeLabel = `${formatDateKey(cells[0].dateKey, true)} – ${formatDateKey(cells[6].dateKey, true)}, ${wy}`

  return (
    <section>
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
        <div className="mb-1 grid grid-cols-7 gap-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[10px] font-medium uppercase tracking-wide text-gray-400">{d}</div>
          ))}
        </div>
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

// ── TopMonthCard ──────────────────────────────────────────────────────
export function TopMonthCard({ entries = [] }) {
  const topMonth = findTopMonth(entries)

  if (!topMonth) {
    return (
      <section>
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
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700">{monthLabel}</p>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[10px] font-medium uppercase tracking-wide text-gray-400">{d}</div>
          ))}
        </div>
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

// ── Lowest day finder ─────────────────────────────────────────────────
export function findLowestDay(entries) {
  const dayMap = groupEntriesByDay(entries)
  const distressedDays = Object.entries(dayMap)
    .filter(([, d]) => d.quadrant === "Q2")
    .map(([dateKey, d]) => ({ dateKey, ...d }))
  if (distressedDays.length === 0) return null
  return distressedDays.reduce((worst, day) => {
    return (day.pa - day.na) < (worst.pa - worst.na) ? day : worst
  })
}

// ── Lowest week finder ────────────────────────────────────────────────
export function findLowestWeek(entries) {
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

  let worst = null
  for (const [weekKey, days] of Object.entries(weekMap)) {
    const score = days.reduce((sum, d) => sum + (d.pa - d.na), 0) / days.length
    if (!worst || score < worst.score) worst = { weekKey, score, days }
  }
  return worst
}

// ── Lowest month finder ───────────────────────────────────────────────
export function findLowestMonth(entries) {
  const dayMap = groupEntriesByDay(entries)
  const monthMap = {}

  for (const [dateKey, { pa, na }] of Object.entries(dayMap)) {
    const [year, month] = dateKey.split("-").map(Number)
    const monthKey = `${year}-${String(month).padStart(2, "0")}`
    if (!monthMap[monthKey]) monthMap[monthKey] = []
    monthMap[monthKey].push({ pa, na })
  }

  let worst = null
  for (const [monthKey, days] of Object.entries(monthMap)) {
    const score = days.reduce((sum, d) => sum + (d.pa - d.na), 0) / days.length
    if (!worst || score < worst.score) worst = { monthKey, score }
  }
  return worst
}

// ── LowestDayCard ─────────────────────────────────────────────────────
export function LowestDayCard({ entries = [] }) {
  const lowestDay = findLowestDay(entries)
  const c = Q_CONFIG["Q2"]

  return (
    <section>
      {!lowestDay ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6">
          <p className="text-sm font-medium text-gray-600">No distressed days on record.</p>
          <p className="mt-1 text-sm text-gray-400">
            A distressed day requires PA avg below 2.5 and NA avg ≥ 2.5. This is a good sign.
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${c.border}` }}>
          <div
            className="px-5 py-4"
            style={{ background: c.color, borderBottom: `2px solid ${c.border}` }}
          >
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: c.text }}>{c.label}</p>
            <p className="mt-0.5 text-sm font-medium" style={{ color: c.text }}>{QUADRANT_PHRASES["Q2"]}</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{formatDateKey(lowestDay.dateKey)}</p>
            <p className="mt-1 text-sm" style={{ color: c.text, opacity: 0.8 }}>
              PA avg: {lowestDay.pa} · NA avg: {lowestDay.na}
            </p>
          </div>
          <div className="bg-white px-5 py-4 space-y-6">
            {lowestDay.entries.map((entry, i) => (
              <div key={entry.id}>
                {lowestDay.entries.length > 1 && (
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
                {i < lowestDay.entries.length - 1 && <div className="mt-6 border-t border-gray-100" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

// ── LowestWeekCard ────────────────────────────────────────────────────
export function LowestWeekCard({ entries = [] }) {
  const lowestWeek = findLowestWeek(entries)

  if (!lowestWeek) {
    return (
      <section>
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6">
          <p className="text-sm font-medium text-gray-600">No data yet.</p>
          <p className="mt-1 text-sm text-gray-400">Keep logging — your patterns will appear here.</p>
        </div>
      </section>
    )
  }

  const dayMap = groupEntriesByDay(entries)
  const cells = buildWeekCells(lowestWeek.weekKey, dayMap)
  const [wy] = lowestWeek.weekKey.split("-").map(Number)
  const rangeLabel = `${formatDateKey(cells[0].dateKey, true)} – ${formatDateKey(cells[6].dateKey, true)}, ${wy}`

  return (
    <section>
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
        <div className="mb-1 grid grid-cols-7 gap-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[10px] font-medium uppercase tracking-wide text-gray-400">{d}</div>
          ))}
        </div>
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

// ── LowestMonthCard ───────────────────────────────────────────────────
export function LowestMonthCard({ entries = [] }) {
  const lowestMonth = findLowestMonth(entries)

  if (!lowestMonth) {
    return (
      <section>
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6">
          <p className="text-sm font-medium text-gray-600">No data yet.</p>
          <p className="mt-1 text-sm text-gray-400">Keep logging — your patterns will appear here.</p>
        </div>
      </section>
    )
  }

  const [yearNum, monthNum] = lowestMonth.monthKey.split("-").map(Number)
  const monthLabel = new Date(yearNum, monthNum - 1, 1).toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  })
  const dayMap = groupEntriesByDay(entries)
  const weeks = buildCalendarMonth(yearNum, monthNum - 1, dayMap)

  return (
    <section>
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700">{monthLabel}</p>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[10px] font-medium uppercase tracking-wide text-gray-400">{d}</div>
          ))}
        </div>
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
