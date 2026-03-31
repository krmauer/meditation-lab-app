function formatDate(value) {
  return new Date(value).toLocaleString()
}

export default function PanasResultsTable({ entries = [], loading = false }) {
  return (
    <section style={{ marginTop: "2rem" }}>
      <h2>Previous PANAS Assessments</h2>

      {loading ? (
        <p>Loading PANAS results...</p>
      ) : entries.length === 0 ? (
        <p>No PANAS results yet.</p>
      ) : (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            maxWidth: "1000px",
            marginTop: "1rem",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: "0.5rem",
                  borderBottom: "1px solid #ccc",
                }}
              >
                Created
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "0.5rem",
                  borderBottom: "1px solid #ccc",
                }}
              >
                Timeframe
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "0.5rem",
                  borderBottom: "1px solid #ccc",
                }}
              >
                Notes
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "0.5rem",
                  borderBottom: "1px solid #ccc",
                }}
              >
                Positive Score
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "0.5rem",
                  borderBottom: "1px solid #ccc",
                }}
              >
                Negative Score
              </th>
            </tr>
          </thead>

          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td
                  style={{
                    padding: "0.5rem",
                    borderBottom: "1px solid #eee",
                    verticalAlign: "top",
                  }}
                >
                  {formatDate(entry.created_at)}
                </td>
                <td
                  style={{
                    padding: "0.5rem",
                    borderBottom: "1px solid #eee",
                    verticalAlign: "top",
                  }}
                >
                  {entry.timeframe || "-"}
                </td>
                <td
                  style={{
                    padding: "0.5rem",
                    borderBottom: "1px solid #eee",
                    verticalAlign: "top",
                    maxWidth: "280px",
                  }}
                >
                  {entry.notes || "-"}
                </td>
                <td
                  style={{
                    padding: "0.5rem",
                    borderBottom: "1px solid #eee",
                    verticalAlign: "top",
                  }}
                >
                  {entry.positive_score}
                </td>
                <td
                  style={{
                    padding: "0.5rem",
                    borderBottom: "1px solid #eee",
                    verticalAlign: "top",
                  }}
                >
                  {entry.negative_score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}