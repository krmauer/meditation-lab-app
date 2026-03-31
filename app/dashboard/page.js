"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import PanasForm from "../../components/PanasForm"
import PanasResultsTable from "../../components/PanasResultsTable"

export default function DashboardPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [entries, setEntries] = useState([])
  const [loadingEntries, setLoadingEntries] = useState(true)

  const loadEntries = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setEntries([])
      setLoadingEntries(false)
      return
    }

    setLoadingEntries(true)

    const { data, error } = await supabase
      .from("panas_entries")
      .select("id, created_at, timeframe, notes, positive_score, negative_score")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading PANAS entries:", error)
      setEntries([])
      setLoadingEntries(false)
      return
    }

    setEntries(data || [])
    setLoadingEntries(false)
  }, [])

  useEffect(() => {
    async function initializeDashboard() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      setEmail(user.email || "")
      await loadEntries()
    }

    initializeDashboard()
  }, [router, loadEntries])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Dashboard</h1>
      <p>You are logged in.</p>
      {email && <p>Signed in as: {email}</p>}

      <button
        onClick={handleLogout}
        style={{ marginTop: "1rem", padding: "0.6rem 1rem", cursor: "pointer" }}
      >
        Log out
      </button>

      <PanasForm onSuccess={loadEntries} />
      <PanasResultsTable entries={entries} loading={loadingEntries} />
    </main>
  )
}