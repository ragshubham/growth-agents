export async function postToSlack(webhookUrl: string, payload: any) {
  if (!webhookUrl) return { ok: false, error: "No webhook" };
  if (!/^https:\/\/hooks\.slack\.com\/services\//.test(webhookUrl)) {
    return { ok: false, error: "Invalid Slack webhook URL" };
  }
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Slack ${res.status}: ${text || res.statusText}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Slack fetch error" };
  }
}

export function welcomeBlock(company: string) {
  return {
    text: `Welcome to Shield Agent, ${company || "there"}!`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "👋 Welcome to Shield Agent" } },
      { type: "section", text: { type: "mrkdwn", text: `*Setup complete!* You’ll start getting digests/alerts here.\n• Company: *${company || "—"}*` } }
    ]
  };
}

// --- added by deploy fix: budget guardrail blocks ---
export type SlackBlock = {
  type: 'section' | 'divider' | 'header';
  text?: { type: 'mrkdwn' | 'plain_text'; text: string };
};

export function overBudgetBlocks(params: { company: string; account: string; spend: number; cap: number }) {
  const { company, account, spend, cap } = params;
  const pct = cap > 0 ? Math.round((spend / cap) * 100) : 0;
  return [
    { type: 'header', text: { type: 'plain_text', text: 'Budget Guardrail' } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Company:* ${company}\n*Account:* ${account}\n*Spend today:* ${spend.toFixed(2)} / ${cap.toFixed(0)} (${pct}%)`,
      },
    },
    { type: 'divider' },
  ] as SlackBlock[];
}
