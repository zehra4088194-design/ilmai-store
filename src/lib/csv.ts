/**
 * Minimal CSV parser — no external dependency for a single admin-only bulk
 * import tool. Handles quoted fields (with embedded commas/newlines/escaped
 * `""`), CRLF or LF line endings, and a header row. Not a general-purpose
 * CSV library — just enough for the product-import use case.
 */
export function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const source = text.replace(/\r\n/g, "\n");

  for (let i = 0; i < source.length; i++) {
    const char = source[i] ?? "";
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += char;
      continue;
    }
    if (char === '"') { inQuotes = true; continue; }
    if (char === ",") { row.push(field); field = ""; continue; }
    if (char === "\n") { row.push(field); rows.push(row); field = ""; row = []; continue; }
    field += char;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  const nonEmpty = rows.filter((r) => r.some((cell) => cell.trim().length > 0));
  if (!nonEmpty.length) return [];
  const headers = (nonEmpty[0] ?? []).map((h) => h.trim());
  return nonEmpty.slice(1).map((r) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => { record[header] = (r[index] ?? "").trim(); });
    return record;
  });
}
