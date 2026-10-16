export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
};

function escapeCsvCell(raw: string | number | boolean | null | undefined): string {
  const text = raw === null || raw === undefined ? '' : String(raw);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeCsvCell(column.header)).join(',');
  const lines = rows.map((row) => columns.map((column) => escapeCsvCell(column.value(row))).join(','));
  return [header, ...lines].join('\r\n');
}
