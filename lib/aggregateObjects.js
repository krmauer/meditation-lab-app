export function aggregateObjects(entryRows) {
  const people = new Map()
  const actions = new Map()
  const emotions = new Map()
  const topics = new Map()

  const bump = (map, id, name, extra = {}) => {
    if (!id || !name) return
    const existing = map.get(id)
    if (existing) existing.count += 1
    else map.set(id, { id, name, count: 1, ...extra })
  }

  for (const row of entryRows ?? []) {
    for (const ep of row.entry_people ?? [])   bump(people,  ep.person?.id,  ep.person?.name)
    for (const ea of row.entry_actions ?? [])  bump(actions, ea.action?.id,  ea.action?.name)
    for (const ee of row.entry_emotions ?? [])
      bump(emotions, ee.emotion?.id, ee.emotion?.name, { valence: ee.emotion?.valence ?? 0 })
    for (const et of row.entry_topics ?? [])   bump(topics,  et.topic?.id,   et.topic?.name)
  }

  const toSorted = (m) =>
    Array.from(m.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  return {
    people:   toSorted(people),
    actions:  toSorted(actions),
    emotions: toSorted(emotions),
    topics:   toSorted(topics),
  }
}
