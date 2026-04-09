"use client"

import PanasForm from "../../components/PanasForm"

export default function NewEntryPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">New Entry</h1>
          <p className="mt-1 text-sm text-gray-500">
            Rate each feeling from 1 to 5 and save your assessment.
          </p>
        </header>

        <section className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <PanasForm />
        </section>
      </div>
    </main>
  )
}
