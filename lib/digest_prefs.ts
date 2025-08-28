// lib/digest_prefs.ts
export type MinSeverity = "OK" | "WARN" | "CRIT";

export type DigestItem = {
  kind: "OK" | "WARN" | "CRIT";
  // ...whatever else your item has
};

export function filterByMinSeverity<T extends DigestItem>(items: T[], min: MinSeverity) {
  const rank = { OK: 1, WARN: 2, CRIT: 3 } as const;
  return items.filter(i => rank[i.kind] >= rank[min]);
}

export function onlyNonCritical<T extends DigestItem>(items: T[]) {
  return items.every(i => i.kind !== "CRIT");
}
