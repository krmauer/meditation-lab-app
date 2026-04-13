"use client"

import { useState } from "react"
import { getStrandProfile, getStrandDescription } from "../lib/strandClassifier"

const Q_CONFIG = {
  Q1: { label: "Flourishing",  color: "#1D9E75", bg: "#E1F5EE", border: "#0F6E56", text: "#085041" },
  Q2: { label: "Distressed",   color: "#D85A30", bg: "#FAECE7", border: "#993C1D", text: "#4A1B0C" },
  Q3: { label: "Turbulent",    color: "#BA7517", bg: "#FAEEDA", border: "#854F0B", text: "#412402" },
  Q4: { label: "Disengaged",   color: "#888780", bg: "#F1EFE8", border: "#5F5E5A", text: "#2C2C2A" },
}

const VIEWS = [
  { key: "bars",    label: "Weighted bars" },
  { key: "grid",    label: "2×2 grid" },
  { key: "strands", label: "Strand cards" },
]

const STRAND_FLOOR = 0.20

// ── Visualization A: Horizontal bar chart ────────────────────────────
function BarsView({ pcts, strands }) {
  const order = ["Q1", "Q3", "Q4", "Q2"]
  return (
    <div className="space-y-3">
      {order.map(q => {
        const c = Q_CONFIG[q]
        const pct = Math.round(pcts[q] * 100)
        const isStrand = strands.some(s => s.quadrant === q)
        return (
          <div key={q} style={{ opacity: isStrand ? 1 : 0.4 }}>
            <div className="mb-1 flex justify-between text-xs">
              <span style={{ color: c.text, fontWeight: 500 }}>{c.label}</span>
              <span className="text-gray-400">{pct}%{!isStrand ? " — below threshold" : ""}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${pct}%`, background: c.color }}
              />
            </div>
          </div>
        )
      })}
      <p className="pt-1 text-xs text-gray-400">
        Faded bars are below the 20% threshold and don't count as strands.
      </p>
    </div>
  )
}

// ── Visualization B: 2×2 grid ────────────────────────────────────────
function GridView({ pcts, strands }) {
  const cell = (q) => {
    const c = Q_CONFIG[q]
    const pct = Math.round(pcts[q] * 100)
    const isStrand = strands.some(s => s.quadrant === q)
    return (
      <div
        key={q}
        className="rounded-lg p-3 text-center"
        style={{
          background: c.bg,
          border: `${isStrand ? "1.5px" : "0.5px"} solid ${c.border}`,
          opacity: isStrand ? 1 : 0.35,
        }}
      >
        <div className="text-xl font-medium" style={{ color: c.text }}>{pct}%</div>
        <div className="mt-0.5 text-xs" style={{ color: c.text }}>{c.label}</div>
        {!isStrand && (
          <div className="mt-0.5 text-xs" style={{ color: c.text, opacity: 0.6 }}>below threshold</div>
        )}
      </div>
    )
  }
  return (
    <div>
      <div className="mb-1 grid grid-cols-3 gap-1 text-center">
        <div />
        <div className="text-xs text-gray-400">Low NA</div>
        <div className="text-xs text-gray-400">High NA</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center justify-end pr-1 text-xs text-gray-400" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: 80 }}>High PA</div>
        {cell("Q1")}
        {cell("Q3")}
        <div className="flex items-center justify-end pr-1 text-xs text-gray-400" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: 80 }}>Low PA</div>
        {cell("Q4")}
        {cell("Q2")}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Grid reflects the underlying PA/NA axes. Faded cells are below the 20% threshold.
      </p>
    </div>
  )
}

// ── Visualization C: Strand cards ───────────────────────────────────
function StrandsView({ strands, pcts, landscape }) {
  const below = ["Q1", "Q2", "Q3", "Q4"].filter(
    q => pcts[q] > 0 && pcts[q] < STRAND_FLOOR
  )
  return (
    <div className="space-y-3">
      {below.length > 0 && (
        <p className="text-xs text-gray-400">
          {below.map(q => `${Q_CONFIG[q].label} (${Math.round(pcts[q] * 100)}%)`).join(", ")}
          {" — below threshold, not shown as strands."}
        </p>
      )}
      {strands.map(s => {
        const c = Q_CONFIG[s.quadrant]
        const pct = Math.round(s.pct * 100)
        const size = s.pct >= 0.40 ? "Major thread" : s.pct >= 0.30 ? "Significant thread" : "Present thread"
        const desc = getStrandDescription(s.quadrant, s.pct)
        return (
          <div
            key={s.quadrant}
            className="rounded-lg p-3"
            style={{ background: c.bg, borderLeft: `3px solid ${c.color}` }}
          >
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm font-medium" style={{ color: c.text }}>{c.label}</span>
              <span className="text-xs text-gray-400">{size} · {pct}% of days</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-700">{desc}</p>
          </div>
        )
      })}
      {landscape && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            Overall landscape · {landscape.label}
          </p>
          <p className="text-sm leading-relaxed text-gray-700">{landscape.text}</p>
        </div>
      )}
    </div>
  )
}

// ── Main export ──────────────────────────────────────────────────────
export default function StrandProfile({ entries = [] }) {
  const [view, setView] = useState("strands")

  const result = getStrandProfile(entries)

  if (result.error === "not_enough_data") {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
        At least 7 entries are needed to generate an affective profile.
      </div>
    )
  }

  const { strands, pcts, landscape, n } = result

  return (
    <section>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Affective Profile</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Based on {n} entries · {strands.length} active strand{strands.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-1 self-start rounded-lg border border-gray-200 bg-gray-50 p-1">
          {VIEWS.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                view === v.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === "bars"    && <BarsView    pcts={pcts} strands={strands} />}
      {view === "grid"    && <GridView    pcts={pcts} strands={strands} />}
      {view === "strands" && <StrandsView strands={strands} pcts={pcts} landscape={landscape} />}

      {view !== "strands" && landscape && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            Overall landscape · {landscape.label}
          </p>
          <p className="text-sm leading-relaxed text-gray-700">{landscape.text}</p>
        </div>
      )}
    </section>
  )
}
