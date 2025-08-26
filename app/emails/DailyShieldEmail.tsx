// app/emails/DailyShieldEmail.tsx
import * as React from "react";

type Severity = "good" | "warn" | "info";
type Alert = { id: string; text: string; severity: Severity };

export default function DailyShieldEmail({
  alerts,
  asOf,
}: {
  alerts: Alert[];
  asOf: string;
}) {
  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system" }}>
      <h2>🛡️ Shield Daily Digest</h2>
      <p style={{ color: "#475569" }}>
        As of: {new Date(asOf).toLocaleString()}
      </p>
      <ul>
        {alerts?.map((a) => (
          <li key={a.id}>
            {a.severity === "warn" ? "⚠️" : a.severity === "good" ? "✅" : "ℹ️"}{" "}
            {a.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
