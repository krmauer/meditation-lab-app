// Thresholds set at scale midpoint (2.50 on 1–5 mean item scale)
// PA < 2.50 = low PA (concerning); NA > 2.50 = high NA (concerning)
// Grounded in Watson et al. (1988) normative data via Crawford & Henry (2004):
// 2.50 sits ~1 SD below the PA population mean (~3.3–3.5, SD ~0.75)
// and ~1 SD above the NA population mean (~1.75–1.85, SD ~0.65)
const PA_THRESHOLD = 2.50
const NA_THRESHOLD = 2.50

export function classifyDay(pa, na) {
  const highPA = pa >= PA_THRESHOLD
  const highNA = na >= NA_THRESHOLD
  if ( highPA && !highNA) return "Q1"  // Flourishing
  if (!highPA &&  highNA) return "Q2"  // Distressed
  if ( highPA &&  highNA) return "Q3"  // Turbulent
  return "Q4"                          // Disengaged
}
