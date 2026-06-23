"use client"

// app/explore/objects/[dimension]/[id]/[dimension2]/[id2]/page.js
//
// Third drill-down level:
//   level 1  /explore/objects                      -> three lists of objects
//   level 2  /explore/objects/people/<jimmy>       -> Jimmy's related objects
//   level 3  /explore/objects/people/<jimmy>/emotions/<happy>
//                                                  -> every entry that has both Jimmy AND happy

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { mergeDays } from "@/lib/mergeDays"
import { filterEntriesByPair } from "@/lib/entryMatch"
import { DayCard } from "@/components/explore/DayCard"
import NavBar from "@/components/NavBar"
import { useAccess } from "@/components/AccessProvider"

// A dimension name maps directly to its lookup table for the title query.
const TABLE_FOR = { people: "people", actions: "actions", emotions: "emotions" }

// "1 entry" / "3 entries", "1 day" / "2 days"
function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`
}

// Same date logic mergeDays uses, so our PANAS filter lines up with it.
function toDateKey(iso) {
  return new Date(iso).toISOString().slice(0, 10)
}

export default function IntersectionPage() {
  const router = useRouter()
  const { dimension, id, dimension2, id2 } = useParams()
  const { loading: accessLoading, isAdvanced } = useAccess()

  const [days, setDays] = useState([])
  const [names, setNames] = useState({ a: "", b: "" })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (accessLoading) return
    if (!isAdvanced) router.replace("/dashboard")
  }, [accessLoading, isAdvanced, router])

  const load = useCallback(async () => {
    setLoading(true)

    // Run everything we need at once instead of waiting in series.
    const [journalResult, panasResult, nameA, nameB] = await Promise.all([
      supabase
        .from("entries")
        .select(`
          id, created_at,
          journal_entries ( text, summary ),
          entry_people   ( roles, person:people ( id, name ) ),
          entry_actions  ( action:actions ( id, name ) ),
          entry_emotions ( emotion:emotions ( id, name, valence ),
                           target:people!target_person_id ( id, name ) )
        `)
        .eq("kind", "journal")
        .order("created_at", { ascending: false }),

      supabase
        .from("panas_entries")
        .select("created_at, positive_avg, negative_avg, notes, active, alert, attentive, determined, inspired, afraid, ashamed, hostile, nervous, upset")
        .order("created_at", { ascending: false }),

      // Just the display names for the header.
      supabase.from(TABLE_FOR[dimension]).select("name").eq("id", id).single(),
      supabase.from(TABLE_FOR[dimension2]).select("name").eq("id", id2).single(),
    ])

    if (journalResult.error) console.error("Journal error:", journalResult.error?.message, journalResult.error?.details)
    if (panasResult.error)   console.error("PANAS error:",   panasResult.error?.message,   panasResult.error?.details)

    setNames({ a: nameA.data?.name ?? "?", b: nameB.data?.name ?? "?" })

    // Keep only entries that contain BOTH entities.
    const matched = filterEntriesByPair(
      journalResult.data,
      { dimension, id },
      { dimension: dimension2, id: id2 }
    )

    // Only attach mood scores for days that actually have a matching entry,
    // otherwise mergeDays would invent empty mood-only days.
    const matchedDates = new Set(matched.map((r) => toDateKey(r.created_at)))
    const panasForDays = (panasResult.data ?? []).filter((p) =>
      matchedDates.has(toDateKey(p.created_at))
    )

    setDays(mergeDays(matched, panasForDays))
    setLoading(false)
  }, [dimension, id, dimension2, id2])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      await load()
    }
    init()
  }, [router, load])

  const entryCount = days.reduce((n, d) => n + d.moments.length, 0)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <NavBar activeTab="objects" />
          <div className="border-t border-gray-200" />
          <div className="bg-white px-5 py-5">
            {/* Back goes to the anchor entity's page (e.g. Jimmy). */}
            <Link
              href={`/explore/objects/${dimension}/${id}`}
              className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
            >
              <ArrowLeft size={16} />
              Back
            </Link>

            <div className="mb-6">
              <h1 className="text-xl font-semibold text-gray-900">
                {names.a} <span className="text-gray-400">+</span> {names.b}
              </h1>
              {!loading && (
                <p className="mt-1 text-sm text-gray-500">
                  {entryCount === 0
                    ? "No entries where these two appear together yet."
                    : `${plural(entryCount, "entry")} across ${plural(days.length, "day")}, newest first.`}
                </p>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
              </div>
            ) : days.length === 0 ? (
              <p className="py-20 text-center text-sm text-gray-400">
                These two haven&apos;t shown up in the same entry.
              </p>
            ) : (
              <div className="space-y-5">
                {days.map((day, i) => (
                  <DayCard key={day.date} day={day} defaultOpen={i === 0} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
