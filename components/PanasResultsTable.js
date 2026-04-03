function formatDate(value) {
  return new Date(value).toLocaleString()
}

export default function PanasResultsTable({ entries = [], loading = false }) {
  return (
    <section>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-gray-900">
          Previous I-PANAS-SF Assessments
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Review your recent entries and summary scores.
        </p>
      </div>

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Loading I-PANAS-SF results...
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600">
          No I-PANAS-SF results yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
                  Created
                </th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
                  Timeframe
                </th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
                  Positive Score
                </th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
                  Negative Score
                </th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
                  Positive Notes
                </th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
                  Negative Notes
                </th>
              </tr>
            </thead>

            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="align-top">
                  <td className="border-b border-gray-100 px-4 py-3 text-gray-700">
                    {formatDate(entry.created_at)}
                  </td>
                  <td className="border-b border-gray-100 px-4 py-3 text-gray-700">
                    {entry.timeframe || "-"}
                  </td>
                  <td className="border-b border-gray-100 px-4 py-3 text-gray-700">
                    {entry.positive_score}
                  </td>
                  <td className="border-b border-gray-100 px-4 py-3 text-gray-700">
                    {entry.negative_score}
                  </td>
                  <td className="max-w-[280px] border-b border-gray-100 px-4 py-3 text-gray-700">
                    {entry.positive_notes || "-"}
                  </td>
                  <td className="max-w-[280px] border-b border-gray-100 px-4 py-3 text-gray-700">
                    {entry.negative_notes || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}