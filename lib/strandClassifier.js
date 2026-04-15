// Thresholds set at scale midpoint (2.50 on 1–5 mean item scale)
// PA < 2.50 = low PA (concerning); NA > 2.50 = high NA (concerning)
// Grounded in Watson et al. (1988) normative data via Crawford & Henry (2004):
// 2.50 sits ~1 SD below the PA population mean (~3.3–3.5, SD ~0.75)
// and ~1 SD above the NA population mean (~1.75–1.85, SD ~0.65)
const PA_THRESHOLD = 2.50
const NA_THRESHOLD = 2.50
const STRAND_FLOOR = 0.20  // quadrant must appear ≥20% of days to be a strand

export function classifyDay(pa, na) {
  const highPA = pa >= PA_THRESHOLD
  const highNA = na >= NA_THRESHOLD
  if ( highPA && !highNA) return "Q1"  // Flourishing
  if (!highPA &&  highNA) return "Q2"  // Distressed
  if ( highPA &&  highNA) return "Q3"  // Turbulent
  return "Q4"                          // Disengaged
}

export function getStrandProfile(entries) {
  // entries: array of objects with positive_avg and negative_avg fields
  // Minimum 7 entries required for a meaningful profile
  const validEntries = entries.filter(
    e => e.positive_avg != null && e.negative_avg != null
  )
  if (validEntries.length < 7) {
    return { error: "not_enough_data", strands: [], landscape: null }
  }

  // Count how many days fell in each quadrant
  const counts = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
  validEntries.forEach(e => {
    counts[classifyDay(e.positive_avg, e.negative_avg)]++
  })

  const n = validEntries.length
  const pcts = {
    Q1: counts.Q1 / n,
    Q2: counts.Q2 / n,
    Q3: counts.Q3 / n,
    Q4: counts.Q4 / n,
  }

  // Strands: only quadrants at or above the 20% floor, sorted largest first
  const strands = ["Q1", "Q2", "Q3", "Q4"]
    .filter(q => pcts[q] >= STRAND_FLOOR)
    .sort((a, b) => pcts[b] - pcts[a])
    .map(q => ({ quadrant: q, pct: pcts[q] }))

  const landscape = getLandscape(strands)

  return { strands, pcts, landscape, n: validEntries.length }
}

function getLandscape(strands) {
  const qs = strands.map(s => s.quadrant)
  const has = q => qs.includes(q)

  // Single strand: no landscape synthesis needed
  if (strands.length <= 1) return null

  // ── Two-strand landscapes ─────────────────────────────────────────
  if (qs.length === 2) {
    if (has("Q1") && has("Q4")) return {
      key: "Q1Q4", label: "Push and pull",
      text: "Your data has a push-and-pull quality — genuine good periods and quieter, lower-energy stretches taking turns. The contrast between them is probably noticeable from the inside."
    }
    if (has("Q1") && has("Q2")) return {
      key: "Q1Q2", label: "Living in the contrast",
      text: "There's a real split between genuinely good periods and genuinely hard ones — close enough in size that your recent experience hasn't settled. You're living in the gap between them."
    }
    if (has("Q1") && has("Q3")) return {
      key: "Q1Q3", label: "Energized, at a cost",
      text: "Your days have mostly had real activation — the difference is whether tension was present alongside it. The positive energy is consistent; the question is what the tension is about."
    }
    if (has("Q3") && has("Q2")) return {
      key: "Q3Q2", label: "Running hard",
      text: "Both threads involve elevated tension — one with energy driving it, one without. Your nervous system has been working hard in both registers. That's a tiring combination over time."
    }
    if (has("Q3") && has("Q4")) return {
      key: "Q3Q4", label: "Running hot and cold",
      text: "Your days have alternated between driven and flat — high activation followed by low. That oscillation may be more structured than it feels."
    }
    if (has("Q2") && has("Q4")) return {
      key: "Q2Q4", label: "Low energy, two kinds",
      text: "Both threads involve low energy — one with tension alongside it, one without. Together they suggest your days haven't had much that's been activating or lifting recently."
    }
  }

  // ── Three-strand landscapes ────────────────────────────────────────
  if (qs.length === 3) {
    if (has("Q1") && has("Q3") && has("Q4")) return {
      key: "Q1Q3Q4", label: "Wide range, positive lean",
      text: "Your days have covered a wide range — some genuinely good, some driven and tense, some quiet and muted. The positive and activated threads are both present, giving this pattern a forward-leaning quality."
    }
    if (has("Q1") && has("Q2") && has("Q4")) return {
      key: "Q1Q2Q4", label: "Genuine contrast",
      text: "Three distinct kinds of days — good, hard, and flat — have all been present recently. There's no single emotional texture right now."
    }
    if (has("Q1") && has("Q2") && has("Q3")) return {
      key: "Q1Q2Q3", label: "High activation, mixed valence",
      text: "Most of your days had real energy — in both directions. Tension has been a consistent presence whether the day felt good or hard."
    }
    if (has("Q2") && has("Q3") && has("Q4")) return {
      key: "Q2Q3Q4", label: "Tension as the common thread",
      text: "Two of your three threads carry elevated tension, and the third is low energy. Ease has been hard to find recently, regardless of which kind of day it was."
    }
  }

  // ── Four-strand landscape ──────────────────────────────────────────
  if (qs.length === 4) return {
    key: "all", label: "No settled pattern",
    text: "All four kinds of days have been meaningfully present recently. There isn't a single overall texture — what the data shows is a period of genuine flux."
  }

  return null
}

// Strand description text — varies by quadrant and weight
export function getStrandDescription(quadrant, pct) {
  const high = pct >= 0.40
  const descriptions = {
    Q1: {
      high: "A real portion of your days have had genuine energy and lightness — these are your better days, and they're not rare.",
      low:  "Some of your days have felt genuinely good — energized, relatively unburdened. They're outnumbered by other kinds of days, but they're present."
    },
    Q2: {
      high: "A significant thread in your recent days has been low energy paired with real tension or heaviness — this combination has been a consistent presence.",
      low:  "There's a meaningful thread of harder days — ones where both energy and weight have been difficult at the same time. These aren't dominant, but they're real."
    },
    Q3: {
      high: "A lot of your days have had real activation — genuine drive and engagement — but also a current of tension or intensity running alongside it.",
      low:  "Some of your days have had a wired quality — engaged and energized, but carrying tension with it."
    },
    Q4: {
      high: "A significant portion of your days have felt muted — not painful, but low on energy or engagement, a flatness that sits underneath things.",
      low:  "There's a thread of quieter, more muted days — not distressed, but not particularly activated either."
    },
  }
  return descriptions[quadrant][high ? "high" : "low"]
}
