"use client"

import { useState } from "react"
import { Q_CONFIG } from "../lib/quadrantConfig"
import {
  findTopDay, findTopWeek, findTopMonth,
  findLowestDay, findLowestWeek, findLowestMonth,
} from "./TopDayCard"
import TopDayCard, { TopWeekCard, TopMonthCard } from "./TopDayCard"
import { LowestDayCard, LowestWeekCard, LowestMonthCard } from "./TopDayCard"
import { groupEntriesByDay } from "../lib/calendarUtils"

// ── Helpers ───────────────────────────────────────────────────────────

function computeDeviationBadge(periodScore, entries) {
  if (periodScore == null) return null

  const dayMap = groupEntriesByDay(entries)
  const allDays = Object.values(dayMap)
  if (allDays.length === 0) return null

  const baseline =
    allDays.reduce((sum, d) => sum + (d.pa - d.na), 0) / allDays.length

  const diff = periodScore - baseline

  function softLabel(diff) {
    if (diff > 0) return { label: "Slightly above average", positive: true,  neutral: false }
    if (diff < 0) return { label: "Slightly below average", positive: false, neutral: false }
    return              { label: "Near your average",       positive: false, neutral: true  }
  }

  if (Math.abs(baseline) < 0.3) return softLabel(diff)

  if (Math.abs(diff) < 0.2) return softLabel(diff)

  const pct = Math.round((diff / Math.abs(baseline)) * 100)

  if (pct > 200)  return { label: "+200%+ above your avg", positive: true,  neutral: false }
  if (pct < -200) return { label: "−200%+ below your avg", positive: false, neutral: false }

  const sign = pct > 0 ? "+" : ""
  const direction = pct > 0 ? "above" : "below"
  return {
    label: `${sign}${pct}% ${direction} your avg`,
    positive: pct > 0,
    neutral: false,
  }
}

function formatDate(dateKey, short = false) {
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

function getWeekRange(weekKey, dayMap) {
  const [year, month, day] = weekKey.split("-").map(Number)
  const sunday = new Date(year, month - 1, day)
  const cells = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-")
  })
  const wy = sunday.getFullYear()
  return `${formatDate(cells[0], true)} – ${formatDate(cells[6], true)}, ${wy}`
}

function getMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  })
}

// ── AccordionRow ──────────────────────────────────────────────────────

function AccordionRow({ header, children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-gray-50"
      >
        {header}
        <span
          className="ml-3 flex-shrink-0 text-gray-400 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="px-4 pb-5 pt-1">
          {children}
        </div>
      )}
    </div>
  )
}

// ── AccordionHeader ───────────────────────────────────────────────────

function AccordionHeader({ period, result, quadrant, dateLabel, noDataLabel, badge }) {
  if (!result) {
    return (
      <div className="flex items-center gap-3">
        <span className="w-12 text-sm font-semibold text-gray-700">{period}</span>
        <span className="text-sm text-gray-400">{noDataLabel}</span>
      </div>
    )
  }

  const c = quadrant ? Q_CONFIG[quadrant] : null

  function badgeStyle(badge) {
    if (!badge) return { bg: "#F3F4F6", text: "#6B7280" }
    if (badge.neutral) return { bg: "#F3F4F6", text: "#6B7280" }
    return badge.positive
      ? { bg: "#DCFCE7", text: "#15803D" }
      : { bg: "#FEE2E2", text: "#B91C1C" }
  }

  const bs = badgeStyle(badge)

  return (
    <div className="flex items-center gap-3">
      <span className="w-12 text-sm font-semibold text-gray-700">{period}</span>
      {c ? (
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ background: c.color, color: c.text }}
        >
          {c.label}
        </span>
      ) : badge ? (
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ background: bs.bg, color: bs.text }}
        >
          {badge.label}
        </span>
      ) : null}
      <span className="text-sm text-gray-600">{dateLabel}</span>
    </div>
  )
}

// ── AccordionGroup ────────────────────────────────────────────────────

function AccordionGroup({ title, subtitle, accentColor, children }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div
        className="px-4 py-3"
        style={{ borderLeft: `4px solid ${accentColor}`, background: "#F9FAFB" }}
      >
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div>
        {children}
      </div>
    </div>
  )
}

// ── SummaryAccordion (main export) ────────────────────────────────────

export default function SummaryAccordion({ entries = [] }) {
  const dayMap = groupEntriesByDay(entries)

  const topDay      = findTopDay(entries)
  const topWeek     = findTopWeek(entries)
  const topMonth    = findTopMonth(entries)
  const lowestDay   = findLowestDay(entries)
  const lowestWeek  = findLowestWeek(entries)
  const lowestMonth = findLowestMonth(entries)

  const topDayBadge      = computeDeviationBadge(topDay ? (topDay.pa - topDay.na) : null,           entries)
  const topWeekBadge     = computeDeviationBadge(topWeek?.score,     entries)
  const topMonthBadge    = computeDeviationBadge(topMonth?.score,    entries)
  const lowestDayBadge   = computeDeviationBadge(lowestDay ? (lowestDay.pa - lowestDay.na) : null,  entries)
  const lowestWeekBadge  = computeDeviationBadge(lowestWeek?.score,  entries)
  const lowestMonthBadge = computeDeviationBadge(lowestMonth?.score, entries)

  return (
    <div className="space-y-6">

      {/* ── Highs group ── */}
      <AccordionGroup
        title="Your highs"
        subtitle="Best recorded day, week, and month — all time."
        accentColor={Q_CONFIG["Q1"].border}
      >
        <AccordionRow
          header={
            <AccordionHeader
              period="Day"
              result={topDay}
              dateLabel={topDay ? formatDate(topDay.dateKey) : null}
              noDataLabel="No flourishing days yet"
              badge={topDayBadge}
            />
          }
        >
          <TopDayCard entries={entries} />
        </AccordionRow>

        <AccordionRow
          header={
            <AccordionHeader
              period="Week"
              result={topWeek ? { pa: null, na: null, score: topWeek.score } : null}
              dateLabel={topWeek ? getWeekRange(topWeek.weekKey, dayMap) : null}
              badge={topWeekBadge}
              noDataLabel="No data yet"
            />
          }
        >
          <TopWeekCard entries={entries} />
        </AccordionRow>

        <AccordionRow
          header={
            <AccordionHeader
              period="Month"
              result={topMonth ? { pa: null, na: null, score: topMonth.score } : null}
              dateLabel={topMonth ? getMonthLabel(topMonth.monthKey) : null}
              badge={topMonthBadge}
              noDataLabel="No data yet"
            />
          }
        >
          <TopMonthCard entries={entries} />
        </AccordionRow>
      </AccordionGroup>

      {/* ── Lows group ── */}
      <AccordionGroup
        title="Your lows"
        subtitle="Most difficult recorded day, week, and month — all time."
        accentColor={Q_CONFIG["Q2"].border}
      >
        <AccordionRow
          header={
            <AccordionHeader
              period="Day"
              result={lowestDay}
              dateLabel={lowestDay ? formatDate(lowestDay.dateKey) : null}
              noDataLabel="No distressed days on record"
              badge={lowestDayBadge}
            />
          }
        >
          <LowestDayCard entries={entries} />
        </AccordionRow>

        <AccordionRow
          header={
            <AccordionHeader
              period="Week"
              result={lowestWeek ? { pa: null, na: null, score: lowestWeek.score } : null}
              dateLabel={lowestWeek ? getWeekRange(lowestWeek.weekKey, dayMap) : null}
              badge={lowestWeekBadge}
              noDataLabel="No data yet"
            />
          }
        >
          <LowestWeekCard entries={entries} />
        </AccordionRow>

        <AccordionRow
          header={
            <AccordionHeader
              period="Month"
              result={lowestMonth ? { pa: null, na: null, score: lowestMonth.score } : null}
              dateLabel={lowestMonth ? getMonthLabel(lowestMonth.monthKey) : null}
              badge={lowestMonthBadge}
              noDataLabel="No data yet"
            />
          }
        >
          <LowestMonthCard entries={entries} />
        </AccordionRow>
      </AccordionGroup>

    </div>
  )
}
