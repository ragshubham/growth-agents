// lib/slack.ts
import { formatMoney } from '@/lib/money';

export type SlackBlock = Record<string, any>;

/** Post blocks to a Slack webhook. Returns {ok,error?}. */
export async function postSlack(
  webhookUrl: string,
  blocks: SlackBlock[],
  fallbackText = 'Notification'
): Promise<{ ok: boolean; error?: string }> {
  if (!webhookUrl) return { ok: false, error: 'No webhook' };
  try {
    const r = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: fallbackText, blocks }),
      cache: 'no-store',
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      return { ok: false, error: `Slack ${r.status} ${txt.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Slack post failed' };
  }
}

/** Same as above but THROWS if Slack rejects. */
export async function postToSlack(
  webhookUrl: string,
  blocks: SlackBlock[],
  fallbackText = 'Notification'
) {
  const res = await postSlack(webhookUrl, blocks, fallbackText);
  if (!res.ok) throw new Error(res.error || 'Slack post failed');
}

/** Over-budget alert blocks. */
export function overBudgetBlocks(
  provider: string,
  spend: number,
  cap: number,
  currency = 'USD'
): SlackBlock[] {
  const pct = cap > 0 ? Math.round((spend / Math.max(cap, 1e-9)) * 100) : 0;
  return [
    { type: 'header', text: { type: 'plain_text', text: `🚨 Spend Alert: ${provider}`, emoji: true } },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Today's Spend*\n${formatMoney(spend, currency)}` },
        { type: 'mrkdwn', text: `*Guardrail Cap*\n${formatMoney(cap, currency)}` },
        { type: 'mrkdwn', text: `*Over by*\n${pct}%` },
      ],
    },
  ];
}

/** Daily spend digest blocks. */
export function spendDigestBlocks(opts: {
  company: string;
  currency: string;
  metaSpend: number;
  impressions?: number;
  clicks?: number;
  cap?: number;
  over?: boolean;
  note?: string;
}): SlackBlock[] {
  const { company, currency, metaSpend, impressions = 0, clicks = 0, cap = 0, over = false, note } = opts;

  const blocks: SlackBlock[] = [
    { type: 'header', text: { type: 'plain_text', text: `Daily Spend — ${company}`, emoji: true } },
  ];

  if (note) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `:warning: _${note}_` } });
  }

  blocks.push({
    type: 'section',
    fields: [
      { type: 'mrkdwn', text: `*Meta*\n${formatMoney(metaSpend, currency)}` },
      { type: 'mrkdwn', text: `*Impressions*\n${Number(impressions).toLocaleString()}` },
      { type: 'mrkdwn', text: `*Clicks*\n${Number(clicks).toLocaleString()}` },
      { type: 'mrkdwn', text: `*Guardrail*\n${cap ? formatMoney(cap, currency) : '—'}` },
    ],
  });

  blocks.push({
    type: 'context',
    elements: [
      { type: 'mrkdwn', text: over ? ':rotating_light: *Over budget today!*' : ':white_check_mark: On track' },
    ],
  });

  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: 'Guardrail compares today’s spend to your daily cap. Edit in *Settings → Company*.' }],
  });

  return blocks;
}

