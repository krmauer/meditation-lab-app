// lib/entryMatch.js
//
// Helpers for "does this journal entry contain a given entity?" and
// "keep only the entries that contain BOTH of two entities."
//
// The shape these functions expect is exactly what your `entries` query
// returns from PostgREST, e.g.:
//   {
//     id, created_at,
//     entry_people:   [{ roles, person:  { id, name } }, ...],
//     entry_actions:  [{        action:  { id, name } }, ...],
//     entry_emotions: [{ emotion: { id, name, valence }, target: {...} }, ...],
//   }

// Each "dimension" the user can click maps to (a) the junction table name
// that PostgREST nests under, and (b) the key the real entity lives on.
const DIMENSION_MAP = {
  people:   { table: "entry_people",   entity: "person" },
  actions:  { table: "entry_actions",  entity: "action" },
  emotions: { table: "entry_emotions", entity: "emotion" },
}

// Does ONE entry row contain the entity identified by (dimension, id)?
export function entryHas(row, dimension, id) {
  const map = DIMENSION_MAP[dimension]
  if (!map) return false
  const links = row[map.table] ?? []          // e.g. row.entry_people
  return links.some((link) => link[map.entity]?.id === id)
}

// Keep only the entries where BOTH entities appear. Order is irrelevant:
// "Jimmy + walk" returns the same set as "walk + Jimmy".
//   a, b: { dimension: "people"|"actions"|"emotions", id: string }
export function filterEntriesByPair(rows, a, b) {
  return (rows ?? []).filter(
    (row) => entryHas(row, a.dimension, a.id) && entryHas(row, b.dimension, b.id)
  )
}
