// lib/csv.ts
export type CsvRow = Record<string, string>;

/** Fetch a CSV URL and parse it into an array of rows (string -> string). */
export async function fetchCsv(url: string): Promise<CsvRow[]> {
  const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) throw new Error(`CSV fetch failed ${res.status}`);
  const text = await res.text();
  return parseCsv(text);
}

/** Minimal CSV parser (handles commas, quotes, newlines) */
export function parseCsv(csv: string): CsvRow[] {
  // very lightweight parser suited for well-formed CSV (id,text,severity,updatedAt,brand?)
  const lines = csv.replace(/\r/g, '').split('\n');
  const header = splitCsvLine(lines.shift() || '');
  const rows: CsvRow[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const cells = splitCsvLine(trimmed);
    const row: CsvRow = {};
    for (let i = 0; i < header.length; i++) {
      row[header[i]] = (cells[i] ?? '').trim();
    }
    rows.push(row);
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { // escaped quote
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
