"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Activity, PenLine } from "lucide-react"
import { useAccess } from "./AccessProvider"

export default function NewEntryMenu() {
  const router = useRouter()
  const { isAdvanced } = useAccess()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  function go(path) {
    setOpen(false)
    router.push(path)
  }

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"
      >
        New Entry
        <ChevronDown className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
          <button
            onClick={() => go("/new-entry")}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100"
          >
            <Activity className="h-4 w-4 text-gray-400" />
            New PANAS
          </button>
          {isAdvanced && (
            <button
              onClick={() => go("/new-note")}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100"
            >
              <PenLine className="h-4 w-4 text-gray-400" />
              New Note
            </button>
          )}
        </div>
      )}
    </div>
  )
}
