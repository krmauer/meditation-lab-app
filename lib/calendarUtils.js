import { classifyDay } from "./strandClassifier"

// Groups raw entries into a day map keyed by "YYYY-MM-DD".
// Each day bucket contains: pa, na, quadrant, notes[], entries[].
// This is the canonical version — richer than the HeatmapCalendar-only
// version it replaces, but fully backwards compatible (extra fields are
// simply ignored by components that don't need them).
export function groupEntriesByDay(entries) {
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

// Builds a 2D array (weeks → days) for a calendar month grid.
// Null slots represent padding days before the 1st or after the last day.
// Each non-null slot: { dateKey, dayNumber, pa, na, quadrant }
export function buildCalendarMonth(year, month, dayMap) {
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
