export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function rowsToCsv(
  headers: string[],
  rows: Record<string, unknown>[],
): string {
  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(row[header])).join(","),
    ),
  ];

  return lines.join("\n");
}

export function parseCsvSection(sectionText: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const records = parseCsvRecords(sectionText.trim());
  if (records.length === 0) return { headers: [], rows: [] };

  const [headers, ...values] = records;
  return {
    headers,
    rows: values
      .filter((row) => row.some((value) => value.length > 0))
      .map((row) =>
        Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])),
      ),
  };
}

function parseCsvRecords(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (quoted) {
      if (char === '"' && nextChar === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }

  row.push(value);
  rows.push(row);

  return rows;
}
