"use client"

import { useState } from "react"
import { User, Activity, Heart, ChevronDown, ChevronUp, CalendarDays } from "lucide-react"
import { Q_CONFIG } from "../../lib/quadrantConfig"
import ScoreRow from "../shared/ScoreRow"

const QUADRANT_PHRASES = {
  Q1: "High energy, low friction.",
  Q2: "High tension, low fuel.",
  Q3: "High energy, high tension.",
  Q4: "Low tension, low drive.",
}

const POSITIVE_ITEMS = [
  { key: "active", label: "Active" },
  { key: "alert", label: "Alert" },
  { key: "attentive", label: "Attentive" },
  { key: "determined", label: "Determined" },
  { key: "inspired", label: "Inspired" },
]
const NEGATIVE_ITEMS = [
  { key: "afraid", label: "Afraid" },
  { key: "ashamed", label: "Ashamed" },
  { key: "hostile", label: "Hostile" },
  { key: "nervous", label: "Nervous" },
  { key: "upset", label: "Upset" },
]

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })
}

function valenceStyle(v) {
  if (v <= -1) return { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" }
  if (v >= 1)  return { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" }
  return { bg: "#f9fafb", border: "#e5e7eb", text: "#4b5563" }
}

function PersonChip({ name, roles }) {
  const mentionedOnly = roles.length === 1 && roles[0] === "mentioned"
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{
        background: mentionedOnly ? "transparent" : "#eef2ff",
        borderColor: mentionedOnly ? "#d1d5db" : "#c7d2fe",
        borderStyle: mentionedOnly ? "dashed" : "solid",
        color: mentionedOnly ? "#6b7280" : "#3730a3",
      }}
    >
      <User size={12} />
      {name}
      {mentionedOnly && <span className="text-[10px] text-gray-400">mentioned</span>}
    </span>
  )
}

function ActionChip({ name }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600">
      <Activity size={12} />
      {name}
    </span>
  )
}

function EmotionChip({ name, valence, towardPerson }) {
  const s = valenceStyle(valence)
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{ background: s.bg, borderColor: s.border, color: s.text }}
    >
      <Heart size={12} />
      {name}
      {towardPerson && <span className="opacity-70">→ {towardPerson}</span>}
    </span>
  )
}

function ChipGroup({ icon, label, children }) {
  if (!children || children.length === 0) return null
  return (
    <div className="mt-3">
      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {icon} {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Moment({ moment, showDivider }) {
  return (
    <div className={showDivider ? "border-t border-gray-100 pt-4 mt-4" : ""}>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{moment.time}</span>
        {moment.summary && <span className="text-xs text-gray-500">· {moment.summary}</span>}
      </div>
      <p className="text-[15px] leading-relaxed text-gray-800">{moment.text}</p>
      <ChipGroup icon={<User size={11} />} label="People">
        {moment.people.map((p, i) => <PersonChip key={i} {...p} />)}
      </ChipGroup>
      <ChipGroup icon={<Activity size={11} />} label="Actions">
        {moment.actions.map((a, i) => <ActionChip key={i} {...a} />)}
      </ChipGroup>
      <ChipGroup icon={<Heart size={11} />} label="Emotions">
        {moment.emotions.map((e, i) => <EmotionChip key={i} {...e} />)}
      </ChipGroup>
    </div>
  )
}

export function DayCard({ day, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const panas = day.panas
  const q = panas ? Q_CONFIG[panas.quadrant] : null

  return (
    <article
      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
      style={{ borderTop: `4px solid ${q ? q.color : "#E5E7EB"}` }}
    >
      <header
        className="px-5 py-4"
        style={{
          background: q ? q.color : "#F9FAFB",
          borderBottom: `1px solid ${q ? q.border + "33" : "#E5E7EB"}`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide"
              style={{ color: q ? q.text : "#6B7280" }}
            >
              <CalendarDays size={12} />
              {q ? q.label : "No mood score"}
            </p>
            <h2 className="mt-0.5 text-base font-semibold text-gray-900">{formatDate(day.date)}</h2>
            {panas ? (
              <p className="mt-0.5 text-sm" style={{ color: q.text }}>
                {QUADRANT_PHRASES[panas.quadrant]}
                <span className="text-gray-500"> · PA {panas.positive_avg} · NA {panas.negative_avg}</span>
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-gray-500">No PANAS check-in logged this day.</p>
            )}
          </div>
          {panas && (
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-1 rounded-full bg-white/60 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-white"
            >
              Mood detail {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>

        {panas && open && (
          <div className="mt-3 grid gap-x-8 rounded-lg bg-white/70 px-4 py-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Positive</p>
              {POSITIVE_ITEMS.map((it) => (
                <ScoreRow key={it.key} label={it.label} value={panas.items[it.key]} color="#16a34a" />
              ))}
            </div>
            <div className="mt-3 sm:mt-0">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Negative</p>
              {NEGATIVE_ITEMS.map((it) => (
                <ScoreRow key={it.key} label={it.label} value={panas.items[it.key]} color="#dc2626" />
              ))}
            </div>
            {panas.notes && (
              <div className="col-span-full mt-3 border-t border-gray-100 pt-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-500">Check-in note: </span>
                  {panas.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="px-5 py-4">
        {day.moments.length === 0 ? (
          <p className="text-sm text-gray-400">No journal entries this day — mood score only.</p>
        ) : (
          day.moments.map((m, i) => <Moment key={m.id} moment={m} showDivider={i > 0} />)
        )}
      </div>
    </article>
  )
}
