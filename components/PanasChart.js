"use client"

import { useState } from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

function PositiveDot({ cx, cy, value }) {
  const color = value < 2.5 ? "#fda4af" : value <= 4.0 ? "#fde047" : "#86efac"
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#00000033" strokeWidth={1} />
}

function NegativeDot({ cx, cy, value }) {
  const color = value < 1.5 ? "#86efac" : value <= 2.5 ? "#fde047" : "#fda4af"
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#00000033" strokeWidth={1} />
}

const VIEW_OPTIONS = [
  { value: "positive", label: "Positive affect" },
  { value: "negative", label: "Negative affect" },
]

const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_year", label: "This Year" },
  { value: "last_year", label: "Last Year" },
  { value: "all_time", label: "All Time" },
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
    bucket.positiveSum += entry.positive_avg ?? 0
    bucket.negativeSum += entry.negative_avg ?? 0
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

function buildWeekDividers(chartData) {
  return chartData
    .filter((d) => {
      const parsed = new Date(d.date + " 2000")
      return parsed.getDay() === 1
    })
    .map((d) => d.date)
}

function buildTickValues(chartData) {
  return chartData
    .filter((_, i) => i % 7 === 0)
    .map((d) => d.date)
}

export default function PanasChart({ entries = [], loading = false, selectedPeriod = "this_week", onPeriodChange }) {
  const [view, setView] = useState("positive")

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

  const chartData = entries.length > 0 ? buildChartData(entries) : []
  const avgs = computeAvgs(chartData)
  const showWeekDividers = ["this_month", "last_month", "this_year", "last_year", "all_time"].includes(selectedPeriod)
  const weekDividers = showWeekDividers ? buildWeekDividers(chartData) : []
  const tickValues = buildTickValues(chartData)

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
        <div className="flex gap-2 self-start">
          <select
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-gray-400 focus:outline-none"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-gray-400 focus:outline-none"
          >
            {VIEW_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600">
          No data for this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              ticks={tickValues}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
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
            {view === "positive" && (
              <>
                <ReferenceArea y1={1} y2={2.5} fill="#ffe4e6" fillOpacity={0.4} />
                <ReferenceArea y1={2.5} y2={4.0} fill="#fef9c3" fillOpacity={0.4} />
                <ReferenceArea y1={4.0} y2={5} fill="#dcfce7" fillOpacity={0.4} />
              </>
            )}
            {view === "negative" && (
              <>
                <ReferenceArea y1={1} y2={1.5} fill="#dcfce7" fillOpacity={0.4} />
                <ReferenceArea y1={1.5} y2={2.5} fill="#fef9c3" fillOpacity={0.4} />
                <ReferenceArea y1={2.5} y2={5} fill="#ffe4e6" fillOpacity={0.4} />
              </>
            )}
            {view === "positive" && (
              <Line
                type="monotone"
                dataKey="positive"
                name="Positive Score"
                stroke="#000000"
                strokeWidth={2}
                dot={<PositiveDot />}
                activeDot={{ r: 6 }}
              />
            )}
            {view === "positive" && (
              <ReferenceLine
                y={avgs.positive}
                stroke="#2563eb"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: `Avg: ${avgs.positive}`, position: "insideTopRight", fontSize: 11, fill: "#2563eb" }}
              />
            )}
            {view === "negative" && (
              <Line
                type="monotone"
                dataKey="negative"
                name="Negative Score"
                stroke="#000000"
                strokeWidth={2}
                dot={<NegativeDot />}
                activeDot={{ r: 6 }}
              />
            )}
            {view === "negative" && (
              <ReferenceLine
                y={avgs.negative}
                stroke="#be185d"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: `Avg: ${avgs.negative}`, position: "insideTopRight", fontSize: 11, fill: "#be185d" }}
              />
            )}
            {weekDividers.map((dateLabel) => (
              <ReferenceLine
                key={dateLabel}
                x={dateLabel}
                stroke="#d1d5db"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}
