// lib/notify.ts
import { prisma } from '@/lib/prisma';

export type Severity = 'OK' | 'WARN' | 'CRIT';

export function isValidSlackWebhook(url?: string | null) {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.hostname !== 'hooks.slack.com') return false;
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[0] === 'services' && parts.length === 4;
  } catch {
    return false;
  }
}

export function compareSeverity(a: Severity, b: Severity) {
  const order: Record<Severity, number> = { OK: 0, WARN: 1, CRIT: 2 };
  return order[a] - order[b]; // >0 means a is higher
}

/** Quiet hours check: "HH:MM" in company timezone context will be handled at caller */
export function isWithinQuietHours(localHHMM: string, quietStart?: string | null, quietEnd?: string | null) {
  if (!quietStart || !quietEnd) return false;
  const toMin = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  const cur = toMin(localHHMM);
  const start = toMin(quietStart);
  const end = toMin(quietEnd);

  if (start <= end) {
    // same day window e.g. 21:00-07:00 (invalid in this branch, but handle anyway)
    return cur >= start && cur < end;
  } else {
    // crosses midnight e.g. 21:00 -> 07:00
    return cur >= start || cur < end;
  }
}

/** Decide Slack webhook for a given brand + purpose */
export function pickSlackWebhook(opts: {
  company: {
    slackWebhookUrl?: string | null;
    summaryWebhookUrl?: string | null;
    brandWebhookUrls?: any | null; // Prisma.JsonValue
  };
  purpose: 'summary' | 'alert';
  brandName?: string;
}): string | null {
  const { company, purpose, brandName } = opts;

  // Summary prefers summaryWebhookUrl, then global
  if (purpose === 'summary') {
    if (isValidSlackWebhook(company.summaryWebhookUrl)) return company.summaryWebhookUrl!;
    if (isValidSlackWebhook(company.slackWebhookUrl)) return company.slackWebhookUrl!;
    return null;
  }

  // Alerts: brand override -> global
  if (purpose === 'alert') {
    const brandMap = (company.brandWebhookUrls && typeof company.brandWebhookUrls === 'object')
      ? (company.brandWebhookUrls as Record<string, unknown>)
      : {};
    if (brandName && typeof brandMap[brandName] === 'string') {
      const url = String(brandMap[brandName]);
      if (isValidSlackWebhook(url)) return url;
    }
    if (isValidSlackWebhook(company.slackWebhookUrl)) return company.slackWebhookUrl!;
    return null;
  }

  return null;
}

/** Post block kit payload to Slack webhook */
export async function postToSlack(webhookUrl: string, payload: any) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Slack error ${res.status}: ${t}`);
  }
}
