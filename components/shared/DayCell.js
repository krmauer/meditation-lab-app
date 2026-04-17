"use client"

import { useState } from "react"
import { Q_CONFIG } from "../../lib/quadrantConfig"

export default function DayCell({ slot, onDayClick }) {
  const [hovered, setHovered] = useState(false)
  if (!slot) return <div className="aspect-square" />

  const { dayNumber, quadrant, pa, na, dateKey } = slot
  const hasData = quadrant !== null
  const config = hasData ? Q_CONFIG[quadrant] : null

  return (
    <div
      className="relative aspect-square"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`flex h-full w-full items-center justify-center rounded-sm text-xl font-semibold transition-opacity ${hasData ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
        style={{
          background: hasData ? config.color : "#E5E5E3",
          color: hasData ? "#fff" : "#9CA3AF",
          opacity: hasData ? 1 : 0.5,
        }}
        onClick={() => hasData && onDayClick(dateKey)}
      >
        {dayNumber}
      </div>
      {hovered && hasData && (
        <div
          className="absolute bottom-full left-1/2 z-10 mb-1.5 w-36 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs shadow-md"
          style={{ borderTop: `3px solid ${config.color}` }}
        >
          <p className="font-semibold" style={{ color: config.text }}>{config.label}</p>
          <p className="mt-0.5 text-gray-400">{dateKey}</p>
          <div className="mt-1.5 space-y-0.5 text-gray-600">
            <p>PA avg: <span className="font-medium text-gray-800">{pa}</span></p>
            <p>NA avg: <span className="font-medium text-gray-800">{na}</span></p>
          </div>
        </div>
      )}
    </div>
  )
}
