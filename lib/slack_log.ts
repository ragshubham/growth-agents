// lib/slack_log.ts
// uses the bot (xoxb token) to post in a specific channel

type LogParams = {
  ok: boolean;
  count: number;
  updatedAt: string;
  mode: "mock" | "real";
  error?: string;
};

export async function logRun(p: LogParams) {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_LOG_CHANNEL_ID;
  if (!token || !channel) return; // skip silently if not set

  const ist = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const pieces = [
    `🧾 Shield ${p.mode} run`,
    p.ok ? "✅ success" : "❌ fail",
    `• ${p.count} alerts`,
    `• asOf ${p.updatedAt}`,
    `• ${ist} IST`,
  ];
  if (!p.ok && p.error) pieces.push(`\nError: ${p.error}`);

  const text = pieces.join(" ");

  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ channel, text }),
  }).catch(() => {});
}
