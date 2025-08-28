// lib/digest.ts

export type DigestItem = {
  brand?: string;
  kind: "OK" | "WARN" | "CRIT";
  title: string;
  detail?: string;
  link?: string;
};

export type DigestPayload = {
  dateISO: string;  // e.g., new Date().toISOString()
  summary: { ok: number; warn: number; crit: number };
  items: DigestItem[];
  sourceNote?: string;  // e.g. "Meta CSV • Updated 8:45 AM"
};

/* ============ Slack ============ */
export function formatSlackDigest(p: DigestPayload) {
  const header =
    `*🛡 Daily Growth Digest — ${new Date(p.dateISO).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}*\n` +
    `*${p.summary.ok}* stable • *${p.summary.warn}* risks • *${p.summary.crit}* critical\n`;

  const line = (i: DigestItem) => {
    const icon = i.kind === "CRIT" ? "🔴" : i.kind === "WARN" ? "⚠️" : "✅";
    const lead = i.brand ? `*${i.brand}* — ` : "";
    const tail = i.link ? `  <${i.link}|details>` : "";
    return `${icon} ${lead}${i.title}${i.detail ? ` — ${i.detail}` : ""}${tail}`;
  };

  const body = p.items.map(line).join("\n");
  const footer = p.sourceNote ? `\n\n_${p.sourceNote}_` : "";
  const brand = "\n_Powered by the Growth Safety Net_";

  return `${header}\n${body}${footer}${brand}`;
}

/* ============ Email ============ */
export function formatEmailDigest(p: DigestPayload) {
  const icon = (k: DigestItem["kind"]) =>
    k === "CRIT" ? "🔴" : k === "WARN" ? "⚠️" : "✅";

  const rows = p.items.map(
    (i) => `
      <tr>
        <td style="padding:6px">${icon(i.kind)}</td>
        <td style="padding:6px;font-weight:600">${i.brand ?? ""}</td>
        <td style="padding:6px">${i.title}${i.detail ? ` — ${i.detail}` : ""} ${i.link ? `<a href="${i.link}">details</a>` : ""}</td>
      </tr>
    `
  ).join("");

  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#111">
      <h2 style="margin:0 0 8px">🛡 Daily Growth Digest</h2>
      <div style="color:#666;margin-bottom:12px">
        <b>${p.summary.ok}</b> stable • <b>${p.summary.warn}</b> risks • <b>${p.summary.crit}</b> critical
      </div>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      ${p.sourceNote ? `<div style="color:#777;margin-top:12px"><em>${p.sourceNote}</em></div>` : ""}
      <div style="color:#9aa;margin-top:14px;font-size:12px">Powered by the Growth Safety Net</div>
    </div>
  `;
}
