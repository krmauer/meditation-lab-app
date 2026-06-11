"use client"

import Link from "next/link"

export function DimensionList({ title, icon, items, dotColor, dimension }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <span className="text-gray-400">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <span className="ml-auto text-xs text-gray-400">{items.length}</span>
      </header>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-gray-400">None yet.</p>
      ) : (
        <ul className="max-h-[28rem] divide-y divide-gray-50 overflow-y-auto">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={`/explore/objects/${dimension}/${it.id}`}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50"
              >
                {dotColor && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: dotColor(it) }}
                  />
                )}
                <span className="truncate text-sm text-gray-800">{it.name}</span>
                <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  {it.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
