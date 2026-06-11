"use client"

import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"

const tabs = [
  { id: "calendar", label: "Review" },
  { id: "top",      label: "Summary" },
  { id: "days",     label: "Days" },
  { id: "objects",  label: "Objects" },
]

export default function NavBar({ activeTab, onTabChange }) {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  function handleTabClick(id) {
    if (id === "days") {
      router.push("/explore/days")
    } else if (id === "objects") {
      router.push("/explore/objects")
    } else if (onTabChange) {
      onTabChange(id)
    } else {
      router.push(`/dashboard#${id}`)
    }
  }

  return (
    <div className="flex items-center gap-3 bg-gray-100 px-5 py-3">
      <h1 className="text-lg font-semibold text-gray-900">Mood Dashboard</h1>
      <div className="flex-1" />
      <div className="flex gap-1">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
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
  )
}
