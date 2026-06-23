"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import JournalNoteForm from "../../components/JournalNoteForm"
import { useAccess } from "../../components/AccessProvider"

export default function NewNotePage() {
  const router = useRouter()
  const { loading, isAdvanced } = useAccess()

  useEffect(() => {
    if (loading) return
    if (!isAdvanced) router.replace("/dashboard")
  }, [loading, isAdvanced, router])
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">New Note</h1>
          <p className="mt-1 text-sm text-gray-500">
            Write freely. We'll pull out the people, actions, and feelings for you.
          </p>
        </header>

        <section className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <JournalNoteForm />
        </section>
      </div>
    </main>
  )
}
