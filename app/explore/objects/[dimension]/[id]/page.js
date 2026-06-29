"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { User, Activity, Heart, Lightbulb, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { relateEntity } from "@/lib/relateEntity"
import { RelatedList } from "@/components/explore/RelatedList"
import NavBar from "@/components/NavBar"
import { useAccess } from "@/components/AccessProvider"

const META = {
  people:   { label: "Person",  icon: <User size={18} /> },
  actions:  { label: "Action",  icon: <Activity size={18} /> },
  emotions: { label: "Emotion", icon: <Heart size={18} /> },
  topics:   { label: "Topic",   icon: <Lightbulb size={18} /> },
}

export default function EntityDetailPage() {
  const router = useRouter()
  const { dimension, id } = useParams()
  const { loading: accessLoading, isAdvanced } = useAccess()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (accessLoading) return
    if (!isAdvanced) router.replace("/dashboard")
  }, [accessLoading, isAdvanced, router])

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("entries")
      .select(`
        id,
        entry_people   ( person:people ( id, name ) ),
        entry_actions  ( action:actions ( id, name ) ),
        entry_emotions ( emotion:emotions ( id, name, valence ),
                         target:people!target_person_id ( id, name ) ),
        entry_topics   ( topic:topics ( id, name ) )
      `)
      .eq("kind", "journal")
    if (error) console.error("Entity detail error:", error?.message, error?.details)
    setResult(relateEntity(data, dimension, id))
    setLoading(false)
  }, [dimension, id])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      await load()
    }
    init()
  }, [router, load])

  const meta = META[dimension]
  const dims = ["people", "actions", "emotions", "topics"].filter((d) => d !== dimension)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <NavBar activeTab="objects" />
          <div className="border-t border-gray-200" />
          <div className="bg-white px-5 py-5">
            <button
              onClick={() => router.back()}
              className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={16} /> Back
            </button>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
              </div>
            ) : !result?.entity ? (
              <p className="py-20 text-center text-sm text-gray-400">Not found.</p>
            ) : (
              <>
                <header className="mb-6">
                  <div className="flex items-center gap-2 text-gray-400">
                    {meta?.icon}
                    <span className="text-xs font-medium uppercase tracking-wide">{meta?.label}</span>
                  </div>
                  <h1 className="mt-1 text-2xl font-semibold text-gray-900">{result.entity.name}</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Appears in {result.appearances} {result.appearances === 1 ? "entry" : "entries"}.
                  </p>
                </header>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {dims.map((d) => (
                    <RelatedList
                      key={d}
                      dimension={d}
                      items={result.related[d]}
                      directed={
                        (dimension === "emotions" && d === "people") ||
                        (dimension === "people" && d === "emotions")
                          ? result.directed
                          : null
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
