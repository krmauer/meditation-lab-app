"use client"

import { useState } from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const VIEW_OPTIONS = [
  { value: "both", label: "Both positive & negative" },
  { value: "positive", label: "Positive only" },
  { value: "negative", label: "Negative only" },
  { value: "average", label: "Average of both" },
]

function computeAvgs(chartData) {
  if (chartData.length === 0) return { positive: 0, negative: 0, average: 0 }
  const sum = chartData.reduce(
    (acc, d) => ({
      positive: acc.positive + d.positive,
      negative: acc.negative + d.negative,
      average: acc.average + d.average,
    }),
    { positive: 0, negative: 0, average: 0 }
  )
  const n = chartData.length
  return {
    positive: Math.round((sum.positive / n) * 10) / 10,
    negative: Math.round((sum.negative / n) * 10) / 10,
    average: Math.round((sum.average / n) * 10) / 10,
  }
}

function buildChartData(entries) {
  const dayMap = new Map()

  for (const entry of entries) {
    const date = new Date(entry.created_at)
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, { positiveSum: 0, negativeSum: 0, count: 0 })
    }

    const bucket = dayMap.get(dayKey)
    bucket.positiveSum += entry.positive_score
    bucket.negativeSum += entry.negative_score
    bucket.count += 1
  }

  return Array.from(dayMap.entries())
    .reverse()
    .map(([dayKey, { positiveSum, negativeSum, count }]) => {
      const [year, month, day] = dayKey.split("-").map(Number)
      const label = new Date(year, month - 1, day).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      const positive = Math.round((positiveSum / count) * 10) / 10
      const negative = Math.round((negativeSum / count) * 10) / 10
      return {
        date: label,
        positive,
        negative,
        average: Math.round(((positive + negative) / 2) * 10) / 10,
      }
    })
}

export default function PanasChart({ entries = [], loading = false }) {
  const [view, setView] = useState("both")

  if (loading) {
    return (
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-gray-900">
            PANAS Scores Over Time
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Daily average positive and negative affect scores.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Loading chart data...
        </div>
      </section>
    )
  }

  if (entries.length === 0) {
    return (
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-gray-900">
            PANAS Scores Over Time
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Daily average positive and negative affect scores.
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600">
          No data yet. Complete your first assessment to see the chart.
        </div>
      </section>
    )
  }

  const chartData = buildChartData(entries)
  const avgs = computeAvgs(chartData)

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            PANAS Scores Over Time
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Daily average positive and negative affect scores.
          </p>
        </div>
        <select
          value={view}
          onChange={(e) => setView(e.target.value)}
          className="self-start rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-gray-400 focus:outline-none"
        >
          {VIEW_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            domain={[5, 25]}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              fontSize: "13px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "13px", paddingTop: "12px" }} />
          {(view === "both" || view === "positive") && (
            <Line
              type="monotone"
              dataKey="positive"
              name="Positive Score"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ r: 4, fill: "#16a34a" }}
              activeDot={{ r: 6 }}
            />
          )}
          {(view === "both" || view === "positive") && (
            <ReferenceLine
              y={avgs.positive}
              stroke="#2563eb"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: `Avg: ${avgs.positive}`, position: "insideTopRight", fontSize: 11, fill: "#2563eb" }}
            />
          )}
          {(view === "both" || view === "negative") && (
            <Line
              type="monotone"
              dataKey="negative"
              name="Negative Score"
              stroke="#ea580c"
              strokeWidth={2}
              dot={{ r: 4, fill: "#ea580c" }}
              activeDot={{ r: 6 }}
            />
          )}
          {(view === "both" || view === "negative") && (
            <ReferenceLine
              y={avgs.negative}
              stroke="#be185d"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: `Avg: ${avgs.negative}`, position: "insideTopRight", fontSize: 11, fill: "#be185d" }}
            />
          )}
          {view === "average" && (
            <Line
              type="monotone"
              dataKey="average"
              name="Average Score"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 4, fill: "#6366f1" }}
              activeDot={{ r: 6 }}
            />
          )}
          {view === "average" && (
            <ReferenceLine
              y={avgs.average}
              stroke="#0d9488"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: `Avg: ${avgs.average}`, position: "insideTopRight", fontSize: 11, fill: "#0d9488" }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </section>
  )
}
