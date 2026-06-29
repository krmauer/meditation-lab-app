"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { User, Activity, Heart, Lightbulb } from "lucide-react"

const META = {
  people:   { title: "People",   icon: <User size={16} /> },
  actions:  { title: "Actions",  icon: <Activity size={16} /> },
  emotions: { title: "Emotions", icon: <Heart size={16} /> },
  topics:   { title: "Topics",   icon: <Lightbulb size={16} /> },
}

function valenceDot(valence) {
  if (valence <= -1) return "#dc2626"
  if (valence >= 1)  return "#16a34a"
  return "#9ca3af"
}

export function RelatedList({ dimension, items, directed }) {
  const meta = META[dimension]
  const directedMap = new Map((directed ?? []).map((d) => [d.id, d.count]))

  // The page we're on is /explore/objects/[dimension]/[id] — i.e. the
  // "anchor" entity, like Jimmy. useParams() reads those two values
  // straight from the URL, so this component needs no new props.
  const params = useParams()
  const anchorDimension = params.dimension
  const anchorId = params.id

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <span className="text-gray-400">{meta.icon}</span>
        <h2 className="text-sm font-semibold text-gray-900">{meta.title}</h2>
        <span className="ml-auto text-xs text-gray-400">{items.length}</span>
      </header>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-gray-400">None.</p>
      ) : (
        <ul className="max-h-[28rem] divide-y divide-gray-50 overflow-y-auto">
          {items.map((it) => {
            const directedCount = directedMap.get(it.id)
            return (
              <li key={it.id}>
                <Link
                  // Instead of jumping to ANOTHER entity page (the loop you
                  // were seeing), go one level deeper: the list of entries
                  // where BOTH the anchor AND this item appear together.
                  href={`/explore/objects/${anchorDimension}/${anchorId}/${dimension}/${it.id}`}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50"
                >
                  {dimension === "emotions" && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: valenceDot(it.valence ?? 0) }}
                    />
                  )}
                  <span className="truncate text-sm text-gray-800">{it.name}</span>
                  {directedCount ? (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                      ×{directedCount} toward
                    </span>
                  ) : null}
                  <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                    {it.count}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
