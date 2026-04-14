"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import HeatmapCalendar from "../../components/HeatmapCalendar"
import TopDayCard from "../../components/TopDayCard"
import QuadrantModal from "../../components/QuadrantModal"

export default function DashboardPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [entries, setEntries] = useState([])
  const [resultsLoading, setResultsLoading] = useState(true)
  const [modalQuadrant, setModalQuadrant] = useState(null)
  const [activeTab, setActiveTab] = useState("calendar")

  const today = new Date()
  const [calendarYear, setCalendarYear] = useState(today.getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth())

  const loadEntries = useCallback(async (userId) => {
    setResultsLoading(true)
    const { data, error } = await supabase
      .from("panas_entries")
      .select(
        "id, created_at, timeframe, notes, positive_notes, negative_notes, positive_score, negative_score, positive_avg, negative_avg"
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      setEmail(user.email || "")
      await loadEntries(user.id)
    }
    checkUser()
  }, [router, loadEntries])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const filteredEntries = entries.filter(entry => {
    const d = new Date(entry.created_at)
    return d.getFullYear() === calendarYear && d.getMonth() === calendarMonth
  })

  function handleMonthChange(year, month) {
    setCalendarYear(year)
    setCalendarMonth(month)
  }

  const monthLabel = new Date(calendarYear, calendarMonth, 1)
    .toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const tabLabel = new Date(calendarYear, calendarMonth, 1)
    .toLocaleDateString("en-US", { month: "long" })

  const tabs = [
    { id: "calendar", label: tabLabel },
    { id: "top",      label: "Top" },
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      <QuadrantModal
        quadrant={modalQuadrant}
        onClose={() => setModalQuadrant(null)}
      />
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Page header */}
        <header className="mb-6 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Mood Dashboard</h1>
              {email && (
                <p className="mt-1 text-sm text-gray-500">
                  Signed in as <span className="font-medium text-gray-700">{email}</span>
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/new-entry")}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                New Entry
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        {/* Tabbed content card */}
        <div>
          {/* Tab row */}
          <div className="flex items-end gap-1 px-1">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "rounded-t-lg border border-b-0 px-5 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "border-gray-200 bg-white text-gray-900 shadow-sm"
                      : "border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Panel */}
          <div className="rounded-b-xl rounded-tr-xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            {activeTab === "calendar" && (
              <HeatmapCalendar
                entries={entries}
                filteredEntries={filteredEntries}
                calendarYear={calendarYear}
                calendarMonth={calendarMonth}
                onMonthChange={handleMonthChange}
                onQuadrantClick={setModalQuadrant}
              />
            )}
            {activeTab === "top" && (
              <TopDayCard
                entries={filteredEntries}
                monthLabel={monthLabel}
                onQuadrantClick={setModalQuadrant}
              />
            )}
          </div>
        </div>

      </div>
    </main>
  )
}