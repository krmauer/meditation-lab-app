import { classifyDay } from "./strandClassifier"

function formatTime(isoString) {
  const d = new Date(isoString)
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

export function mergeDays(journalRows, panasRows) {
  const map = new Map()

  const getDay = (date) => {
    if (!map.has(date)) map.set(date, { date, panas: null, moments: [] })
    return map.get(date)
  }

  for (const row of journalRows ?? []) {
    const date = new Date(row.created_at).toISOString().slice(0, 10)
    if (!date) continue
    const day = getDay(date)

    // journal_entries is 1:1 — PostgREST may return object or single-element array
    const je = Array.isArray(row.journal_entries)
      ? row.journal_entries[0]
      : row.journal_entries
    if (!je) continue

    day.moments.push({
      id: row.id,
      time: formatTime(row.created_at),
      summary: je.summary ?? null,
      text: je.text ?? "",
      people: (row.entry_people ?? []).map((ep) => ({
        name: ep.person?.name ?? "",
        roles: ep.roles ?? [],
      })),
      actions: (row.entry_actions ?? []).map((ea) => ({
        name: ea.action?.name ?? "",
      })),
      emotions: (row.entry_emotions ?? []).map((ee) => ({
        name: ee.emotion?.name ?? "",
        valence: ee.emotion?.valence ?? 0,
        towardPerson: ee.target?.name ?? null,
      })),
      topics: (row.entry_topics ?? []).map((et) => ({
        name: et.topic?.name ?? "",
      })),
    })
  }

  for (const row of panasRows ?? []) {
    const date = new Date(row.created_at).toISOString().slice(0, 10)
    if (!date) continue
    const day = getDay(date)
    day.panas = {
      positive_avg: row.positive_avg,
      negative_avg: row.negative_avg,
      quadrant: classifyDay(row.positive_avg, row.negative_avg),
      items: {
        active: row.active,
        alert: row.alert,
        attentive: row.attentive,
        determined: row.determined,
        inspired: row.inspired,
        afraid: row.afraid,
        ashamed: row.ashamed,
        hostile: row.hostile,
        nervous: row.nervous,
        upset: row.upset,
      },
      notes: row.notes ?? null,
    }
  }

  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1))
}
