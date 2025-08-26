// lib/slack_dm.ts
type SlackUserLookup = { ok: boolean; user?: { id: string } ; error?: string };
type SlackOpen = { ok: boolean; channel?: { id: string }; error?: string };
type SlackPost = { ok: boolean; error?: string };

export async function dmSlack(text: string) {
  const token = process.env.SLACK_BOT_TOKEN;
  const email = process.env.SLACK_DM_TO_EMAIL;
  if (!token || !email) return; // quietly skip if not configured

  // 1) find user by email
  const userRes = await fetch("https://slack.com/api/users.lookupByEmail", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${token}` },
    body: new URLSearchParams({ email })
  });
  const user: SlackUserLookup = await userRes.json();
  if (!user.ok || !user.user?.id) return;

  // 2) open (or find) an IM channel with that user
  const openRes = await fetch("https://slack.com/api/conversations.open", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${token}` },
    body: new URLSearchParams({ users: user.user.id })
  });
  const open: SlackOpen = await openRes.json();
  const channel = open.channel?.id;
  if (!open.ok || !channel) return;

  // 3) post the message
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ channel, text })
  }).then(r => r.json() as Promise<SlackPost>).catch(() => ({} as SlackPost));
}
