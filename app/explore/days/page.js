"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import { mergeDays } from "../../../lib/mergeDays"
import { DayCard } from "../../../components/explore/DayCard"
import NavBar from "../../../components/NavBar"
import { useAccess } from "../../../components/AccessProvider"

export default function DaysPage() {
  const router = useRouter()
  const { loading: accessLoading, isAdvanced } = useAccess()
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (accessLoading) return
    if (!isAdvanced) router.replace("/dashboard")
  }, [accessLoading, isAdvanced, router])

  const loadDays = useCallback(async () => {
    setLoading(true)

    const [journalResult, panasResult] = await Promise.all([
      supabase
        .from("entries")
        .select(`
          id, created_at,
          journal_entries ( text, summary ),
          entry_people   ( roles, person:people ( name ) ),
          entry_actions  ( action:actions ( name ) ),
          entry_emotions ( emotion:emotions ( name, valence ),
                           target:people!target_person_id ( name ) ),
          entry_topics   ( topic:topics ( name ) )
        `)
        .eq("kind", "journal")
        .order("created_at", { ascending: false }),

      supabase
        .from("panas_entries")
        .select("created_at, positive_avg, negative_avg, notes, active, alert, attentive, determined, inspired, afraid, ashamed, hostile, nervous, upset")
        .order("created_at", { ascending: false }),
    ])

    if (journalResult.error) console.error("Journal error:", journalResult.error?.message, journalResult.error?.details)
    if (panasResult.error)  console.error("PANAS error:",   panasResult.error?.message,  panasResult.error?.details)

    setDays(mergeDays(journalResult.data, panasResult.data))
    setLoading(false)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      await loadDays()
    }
    init()
  }, [router, loadDays])

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <NavBar activeTab="days" />
          <div className="border-t border-gray-200" />
          <div className="bg-white px-5 py-5">
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-gray-900">Your days</h1>
              <p className="mt-1 text-sm text-gray-500">
                Each card is one day — what happened, who was there, and how it felt.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
              </div>
            ) : days.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-20">No entries yet.</p>
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
