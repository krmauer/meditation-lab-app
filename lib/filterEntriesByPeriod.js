export function filterEntriesByPeriod(entries, period) {
  const now = new Date()

  if (period === "all_time") {
    return entries
  }

  let start
  let end = now

  if (period === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }

  else if (period === "yesterday") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }

  else if (period === "this_week") {
    const dayOfWeek = now.getDay()
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
  }

  else if (period === "last_week") {
    const dayOfWeek = now.getDay()
    const thisSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
    start = new Date(thisSunday.getFullYear(), thisSunday.getMonth(), thisSunday.getDate() - 7)
    end = new Date(thisSunday.getFullYear(), thisSunday.getMonth(), thisSunday.getDate())
  }

  else if (period === "this_month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  else if (period === "last_month") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    end = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  else if (period === "this_year") {
    start = new Date(now.getFullYear(), 0, 1)
  }

  else if (period === "last_year") {
    start = new Date(now.getFullYear() - 1, 0, 1)
    end = new Date(now.getFullYear(), 0, 1)
  }

  else {
    return entries
  }

  return entries.filter((entry) => {
    const entryDate = new Date(entry.created_at)
    return entryDate >= start && entryDate < end
  })
}
