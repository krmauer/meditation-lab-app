"use client"

const SCALE_LABELS = {
  1: "Slightly / None",
  2: "A little",
  3: "Moderately",
  4: "Quite a bit",
  5: "Extremely",
}

export default function ScoreRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-700 w-28">{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className="h-3 w-3 rounded-full"
              style={{ background: n <= value ? color : "#E5E7EB" }}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400 w-28">{SCALE_LABELS[value]}</span>
      </div>
    </div>
  )
}
