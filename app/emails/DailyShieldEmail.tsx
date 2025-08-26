/* app/emails/DailyShieldEmail.tsx */
import * as React from "react";

type Severity = "good" | "warn" | "info";
type Alert = { id: string; text: string; severity: Severity };

export default function DailyShieldEmail({
  alerts = [],
  asOf,
}: {
  alerts: Alert[];
  asOf: string;
}) {
  const top3 = alerts.slice(0, 3);
  const istString = new Date(asOf).toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
  });

  const sevEmoji = (s: Severity) =>
    s === "warn" ? "⚠️" : s === "good" ? "✅" : "ℹ️";

  const sevColor = (s: Severity) =>
    s === "warn" ? "#B45309" : s === "good" ? "#0B7A3B" : "#1F4E79";

  const tableRow = (a: Alert, i: number) => (
    <tr key={a.id || i} style={{ borderBottom: "1px solid #eee" }}>
      <td style={{ padding: "10px 12px", width: 36, textAlign: "center" }}>
        {sevEmoji(a.severity)}
      </td>
      <td style={{ padding: "10px 12px", color: "#111827", fontSize: 14, lineHeight: "20px" }}>
        {a.text}
      </td>
      <td style={{ padding: "10px 12px", textAlign: "right" }}>
        <span
          style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 600,
            color: sevColor(a.severity),
          }}
        >
          {a.severity.toUpperCase()}
        </span>
      </td>
    </tr>
  );

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Shield Daily Digest</title>
        <meta name="color-scheme" content="light only" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#F6F7F9",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          color: "#111827",
        }}
      >
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ backgroundColor: "#F6F7F9", padding: "24px 0" }}
        >
          <tbody>
            <tr>
              <td>
                <table
                  role="presentation"
                  width={600}
                  align="center"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    width: 600,
                    margin: "0 auto",
                    backgroundColor: "#ffffff",
                    borderRadius: 12,
                    overflow: "hidden",
                    boxShadow:
                      "0 1px 2px rgba(16,24,40,.06), 0 1px 1px rgba(16,24,40,.04)",
                  }}
                >
                  <tbody>
                    {/* Header */}
                    <tr>
                      <td
                        style={{
                          padding: "20px 24px",
                          background:
                            "linear-gradient(90deg, #111827 0%, #1F2937 100%)",
                          color: "#ffffff",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            letterSpacing: 0.2,
                          }}
                        >
                          🛡️ Shield Daily Digest
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            opacity: 0.85,
                          }}
                        >
                          As of {istString} (IST)
                        </div>
                      </td>
                    </tr>

                    {/* Top 3 */}
                    <tr>
                      <td style={{ padding: "16px 24px" }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#111827",
                            marginBottom: 8,
                          }}
                        >
                          Top alerts
                        </div>

                        {top3.length === 0 ? (
                          <div style={{ fontSize: 14, color: "#6B7280" }}>
                            No alerts today. ✅
                          </div>
                        ) : (
                          <ul
                            style={{
                              listStyle: "none",
                              padding: 0,
                              margin: 0,
                              display: "grid",
                              rowGap: 8,
                            }}
                          >
                            {top3.map((a, i) => (
                              <li
                                key={a.id || i}
                                style={{
                                  fontSize: 14,
                                  lineHeight: "20px",
                                  color: "#111827",
                                }}
                              >
                                <strong style={{ marginRight: 6 }}>
                                  {i + 1}.
                                </strong>{" "}
                                <span style={{ marginRight: 6 }}>
                                  {sevEmoji(a.severity)}
                                </span>
                                {a.text}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>

                    {/* Divider */}
                    <tr>
                      <td style={{ padding: "0 24px" }}>
                        <hr
                          style={{
                            border: 0,
                            borderTop: "1px solid #E5E7EB",
                            margin: "8px 0 0",
                          }}
                        />
                      </td>
                    </tr>

                    {/* All alerts table */}
                    <tr>
                      <td style={{ padding: "16px 24px 20px" }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#111827",
                            marginBottom: 8,
                          }}
                        >
                          All alerts ({alerts.length})
                        </div>

                        {alerts.length === 0 ? (
                          <div style={{ fontSize: 14, color: "#6B7280" }}>
                            Nothing to report.
                          </div>
                        ) : (
                          <table
                            role="presentation"
                            width="100%"
                            cellPadding={0}
                            cellSpacing={0}
                            style={{
                              borderCollapse: "collapse",
                              width: "100%",
                              backgroundColor: "#ffffff",
                            }}
                          >
                            <tbody>{alerts.map(tableRow)}</tbody>
                          </table>
                        )}
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td
                        style={{
                          backgroundColor: "#F9FAFB",
                          padding: "14px 24px",
                          fontSize: 12,
                          color: "#6B7280",
                          textAlign: "center",
                        }}
                      >
                        Growth Agents · Automated digest · {new Date().getFullYear()}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Spacer */}
                <div style={{ height: 24 }} />
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
