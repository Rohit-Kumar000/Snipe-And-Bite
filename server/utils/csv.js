// CSV export helpers. Cells that start with a formula character are prefixed with an
// apostrophe so a spreadsheet never executes data that a user typed (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/;

export const csvCell = (value) => {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (typeof value !== "number" && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// columns: [{ key, label }], rows: array of objects. A BOM is added so Excel reads UTF-8 (₹) correctly.
export const toCsv = (columns, rows) => {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => csvCell(row[c.key])).join(","));
  return `\uFEFF${[header, ...lines].join("\r\n")}\r\n`;
};
