// lib/slack_blocks.ts
type Severity = "good" | "warn" | "info";
type Alert = { id: string; text: string; severity: Severity };

export function buildAlertBlocks(
  alerts: Alert[],
  updatedAt: string,
  heading = "🛡️ Shield Daily Digest"
) {
  const top = alerts.slice(0, 3);

  const items = top.map((a, i) => {
    const emoji = a.severity === "warn" ? "⚠️" : a.severity === "good" ? "✅" : "ℹ️";
    return `*${i + 1}.* ${emoji} ${a.text}`;
  }).join("\n");

  const footer = `as of ${new Date(updatedAt).toLocaleString("en-GB", { timeZone: "Asia/Kolkata" })} (IST)`;

  return [
    { type: "header", text: { type: "plain_text", text: heading } },
    { type: "section", text: { type: "mrkdwn", text: items || "_No alerts today._" } },
    { type: "context", elements: [{ type: "mrkdwn", text: footer }] }
  ];
}
