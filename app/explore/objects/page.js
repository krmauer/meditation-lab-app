"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { User, Activity, Heart } from "lucide-react"
import { supabase } from "../../../lib/supabase"
import { aggregateObjects } from "../../../lib/aggregateObjects"
import { DimensionList } from "../../../components/explore/DimensionList"
import NavBar from "../../../components/NavBar"
import { useAccess } from "../../../components/AccessProvider"

function valenceDot(item) {
  if (item.valence <= -1) return "#dc2626"
  if (item.valence >= 1)  return "#16a34a"
  return "#9ca3af"
}

export default function ObjectsPage() {
  const router = useRouter()
  const { loading: accessLoading, isAdvanced } = useAccess()
  const [objects, setObjects] = useState({ people: [], actions: [], emotions: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (accessLoading) return
    if (!isAdvanced) router.replace("/dashboard")
  }, [accessLoading, isAdvanced, router])

  const loadObjects = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("entries")
      .select(`
        entry_people   ( person:people ( id, name ) ),
        entry_actions  ( action:actions ( id, name ) ),
        entry_emotions ( emotion:emotions ( id, name, valence ) )
      `)
      .eq("kind", "journal")

    if (error) console.error("Objects fetch error:", error?.message, error?.details)
    setObjects(aggregateObjects(data))
    setLoading(false)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      await loadObjects()
    }
    init()
  }, [router, loadObjects])

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <NavBar activeTab="objects" />
          <div className="border-t border-gray-200" />
          <div className="bg-white px-5 py-5">
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-gray-900">Objects</h1>
              <p className="mt-1 text-sm text-gray-500">
                Everyone, everything, and every feeling you&apos;ve recorded — with how often each shows up.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <DimensionList title="People"   dimension="people"   icon={<User size={16} />}     items={objects.people} />
                <DimensionList title="Actions"  dimension="actions"  icon={<Activity size={16} />} items={objects.actions} />
                <DimensionList title="Emotions" dimension="emotions" icon={<Heart size={16} />}    items={objects.emotions} dotColor={valenceDot} />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
