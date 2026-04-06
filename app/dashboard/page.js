"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import PanasForm from "../../components/PanasForm"
import PanasResultsTable from "../../components/PanasResultsTable"
import PanasChart from "../../components/PanasChart"

export default function DashboardPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [entries, setEntries] = useState([])
  const [resultsLoading, setResultsLoading] = useState(true)

  const loadEntries = useCallback(async (userId) => {
    setResultsLoading(true)

    const { data, error } = await supabase
      .from("panas_entries")
      .select(
        "id, created_at, timeframe, positive_notes, negative_notes, positive_score, negative_score"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading I-PANAS-SF entries:", error)
      setEntries([])
      setResultsLoading(false)
      return
    }

    setEntries(data || [])
    setResultsLoading(false)
  }, [])

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      setEmail(user.email || "")
      await loadEntries(user.id)
    }

    checkUser()
  }, [router, loadEntries])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  async function handleFormSuccess() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    await loadEntries(user.id)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Record an I-PANAS-SF entry and review your previous assessments.
              </p>
              {email && (
                <p className="mt-2 text-sm text-gray-600">
                  Signed in as{" "}
                  <span className="font-medium text-gray-900">{email}</span>
                </p>
              )}
            </div>

            <div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <PanasChart entries={entries} loading={resultsLoading} />
          </section>

          <section className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <PanasForm onSuccess={handleFormSuccess} />
          </section>

          <section className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <PanasResultsTable entries={entries} loading={resultsLoading} />
          </section>
        </div>
      </div>
    </main>
  )
}