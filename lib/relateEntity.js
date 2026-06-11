const DIMENSIONS = ["people", "actions", "emotions"]

function normalize(row) {
  return {
    id: row.id,
    people: (row.entry_people ?? [])
      .map((l) => ({ id: l.person?.id, name: l.person?.name }))
      .filter((x) => x.id),
    actions: (row.entry_actions ?? [])
      .map((l) => ({ id: l.action?.id, name: l.action?.name }))
      .filter((x) => x.id),
    emotions: (row.entry_emotions ?? [])
      .map((l) => ({
        id: l.emotion?.id,
        name: l.emotion?.name,
        valence: l.emotion?.valence ?? 0,
        targetId: l.target?.id ?? null,
        targetName: l.target?.name ?? null,
      }))
      .filter((x) => x.id),
  }
}

export function relateEntity(rows, dimension, id) {
  if (!DIMENSIONS.includes(dimension)) {
    return { entity: null, appearances: 0, related: {}, directed: [] }
  }

  const moments = (rows ?? []).map(normalize)

  const appearsIn = moments.filter((m) => m[dimension].some((x) => x.id === id))

  let entity = null
  for (const m of appearsIn) {
    const found = m[dimension].find((x) => x.id === id)
    if (found) { entity = found; break }
  }

  const tally = (key) => {
    const counts = new Map()
    for (const m of appearsIn) {
      for (const x of m[key]) {
        if (key === dimension && x.id === id) continue
        const cur =
          counts.get(x.id) ?? { id: x.id, name: x.name, count: 0, valence: x.valence }
        cur.count += 1
        counts.set(x.id, cur)
      }
    }
    return [...counts.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name)
    )
  }

  const [dimA, dimB] = DIMENSIONS.filter((d) => d !== dimension)

  const directed = new Map()
  if (dimension === "people") {
    for (const m of appearsIn)
      for (const e of m.emotions)
        if (e.targetId === id) {
          const cur = directed.get(e.id) ?? { id: e.id, name: e.name, count: 0 }
          cur.count += 1
          directed.set(e.id, cur)
        }
  } else if (dimension === "emotions") {
    for (const m of appearsIn)
      for (const e of m.emotions)
        if (e.id === id && e.targetId) {
          const cur =
            directed.get(e.targetId) ?? { id: e.targetId, name: e.targetName, count: 0 }
          cur.count += 1
          directed.set(e.targetId, cur)
        }
  }

  return {
    entity,
    appearances: appearsIn.length,
    related: { [dimA]: tally(dimA), [dimB]: tally(dimB) },
    directed: [...directed.values()].sort((a, b) => b.count - a.count),
  }
}
