"use client"

import { useEffect } from "react"
import { Q_CONFIG } from "../lib/quadrantConfig"

const DESCRIPTIONS = {
  Q1: {
    subtitle: "High positive affect · Low negative affect",
    body: `This is the quadrant where energy and ease show up together. Days here tend to have a quality of genuine engagement — things feel manageable, there's motivation available, and the emotional undertow is quiet. That doesn't mean every flourishing day is exceptional or that something dramatic happened. Often it's subtler: a baseline sense of okayness that makes effort feel lighter and connection feel more natural.

The research backing this quadrant is among the most robust in the affect literature — high PA with low NA is consistently associated with wellbeing, resilience, and effective functioning. It's worth noticing what tends to accompany these days, not to manufacture them, but because the patterns are often informative.`,
  },
  Q2: {
    subtitle: "Low positive affect · High negative affect",
    body: `This is the quadrant where things feel genuinely hard. Energy is low, and there's real weight alongside it — tension, worry, or a heaviness that makes ordinary things require more. It's the combination that's significant: negative affect without the counterbalance of positive engagement tends to be the most difficult emotional territory.

Showing up here doesn't mean something is wrong with you — distress is a normal part of a full emotional life, and it often reflects real circumstances rather than disposition. But if this quadrant is consistently dominant over time, that's worth paying attention to. Not as a diagnosis, but as a signal that something may need care or change.`,
  },
  Q3: {
    subtitle: "High positive affect · High negative affect",
    body: `This quadrant has a wired quality to it — activated and engaged, but carrying real tension at the same time. Days here often involve high stakes, pressure, or intensity: the kind of day that's compelling but also draining. It's not a bad place to be in short stretches. Drive and urgency can produce meaningful things.

But the simultaneous elevation of both PA and NA means the nervous system is working hard, and sustained time in this quadrant tends to be costly. People sometimes find this quadrant hard to read from the inside — it can feel productive or even exciting while also being quietly exhausting.`,
  },
  Q4: {
    subtitle: "Low positive affect · Low negative affect",
    body: `This quadrant is quieter than distress but in its own way just as significant. There isn't much activation in either direction — not particularly troubled, but not particularly alive either. It can feel like going through the motions, a kind of flatness or distance from things that would normally matter.

Low negative affect sounds like a good thing, and in isolation it is — but without positive affect alongside it, the result tends to be muted rather than peaceful. Disengagement is sometimes a recovery state after a period of intensity, which is fine. But as a persistent pattern it often points to something — meaning, connection, stimulation — being absent.`,
  },
}

export default function QuadrantModal({ quadrant, onClose }) {
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

  return (
    // Backdrop — clicking it closes the modal
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      {/* Panel — clicking inside does NOT close (stopPropagation) */}
      <div
        className="relative w-full max-w-lg rounded-xl bg-white shadow-xl"
        style={{ borderTop: `4px solid ${c.color}` }}
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

        {/* Header */}
        <div className="px-6 pb-4 pt-5">
          <div className="mb-1 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ background: c.color }} />
            <h2 className="text-lg font-semibold" style={{ color: c.text }}>
              {c.label}
            </h2>
          </div>
          <p className="text-sm text-gray-400">{info.subtitle}</p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100" />

        {/* Body */}
        <div className="px-6 py-5">
          {info.body.split("\n\n").map((paragraph, i) => (
            <p key={i} className={`text-sm leading-relaxed text-gray-700 ${i > 0 ? "mt-4" : ""}`}>
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
