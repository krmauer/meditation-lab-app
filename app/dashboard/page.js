"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import HeatmapCalendar from "../../components/HeatmapCalendar"
import SummaryAccordion from "../../components/SummaryAccordion"
import QuadrantModal from "../../components/QuadrantModal"
import DayDetailPanel from "../../components/DayDetailPanel"

export default function DashboardPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [entries, setEntries] = useState([])
  const [resultsLoading, setResultsLoading] = useState(true)
  const [modalQuadrant, setModalQuadrant] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [activeTab, setActiveTab] = useState("calendar")

  const today = new Date()
  const [calendarYear, setCalendarYear] = useState(today.getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth())

  const loadEntries = useCallback(async (userId) => {
    setResultsLoading(true)
    const { data, error } = await supabase
      .from("panas_entries")
      .select(
        "id, created_at, timeframe, notes, positive_score, negative_score, positive_avg, negative_avg, active, alert, attentive, determined, inspired, afraid, ashamed, hostile, nervous, upset"
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

  const tabs = [
    { id: "calendar", label: "Review" },
    { id: "top",      label: "Summary" },
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      <QuadrantModal
        quadrant={modalQuadrant?.quadrant}
        entries={modalQuadrant?.entries ?? []}
        onClose={() => setModalQuadrant(null)}
      />
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Unified card */}
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">

          {/* Zone 1: Toolbar — grey background */}
          <div className="flex items-center gap-3 bg-gray-100 px-5 py-3">
            <h1 className="text-lg font-semibold text-gray-900">Mood Dashboard</h1>
            <div className="flex-1" />
            <div className="flex gap-1">
              {tabs.map(tab => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={[
                      "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:bg-gray-200 hover:text-gray-700",
                    ].join(" ")}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
            <div className="flex-1" />
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/new-entry")}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                New Entry
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Log out
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Zone 2: Month nav — white, centered */}
          {activeTab === "calendar" && (
            <>
              <div className="flex items-center justify-start gap-3 bg-white px-5 py-3">
                <button
                  onClick={() => {
                    if (calendarMonth === 0) handleMonthChange(calendarYear - 1, 11)
                    else handleMonthChange(calendarYear, calendarMonth - 1)
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
                >
                  ‹
                </button>
                <span className="min-w-[160px] text-center text-lg font-semibold text-gray-900">
                  {monthLabel}
                </span>
                <button
                  onClick={() => {
                    if (calendarMonth === 11) handleMonthChange(calendarYear + 1, 0)
                    else handleMonthChange(calendarYear, calendarMonth + 1)
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
                >
                  ›
                </button>
              </div>
              {/* Divider */}
              <div className="border-t border-gray-200" />
            </>
          )}

          {/* Zone 3: Content — white */}
          <div className="bg-white px-5 py-5">
            {activeTab === "calendar" && (
              <HeatmapCalendar
                entries={entries}
                filteredEntries={filteredEntries}
                calendarYear={calendarYear}
                calendarMonth={calendarMonth}
                onMonthChange={handleMonthChange}
                onQuadrantClick={(quadrant) => setModalQuadrant({ quadrant, entries: filteredEntries })}
                onDayClick={setSelectedDay}
              />
            )}
            {activeTab === "top" && (
              <SummaryAccordion entries={entries} />
            )}
          </div>

        </div>

      </div>
      <DayDetailPanel
        dateKey={selectedDay}
        entries={entries}
        onClose={() => setSelectedDay(null)}
      />
    </main>
  )
}