import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const COLUMNS = {
  date: "Дата",
  time: "Время МСК",
  team: "Команда",
  opponent: "Соперник",
  tournament: "Турнир",
  venue: "Дома/в гостях",
  status: "Статус",
  source: "Источник",
  id: "ID",
};

/**
 * Parse a CSV export of the «Расписание» tab.
 * Quoted fields may contain commas and newlines.
 */
export function parseCsv(text) {
  const source = String(text).replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value.trim() !== ""));
}

export function firstUrl(value) {
  const match = String(value ?? "").match(/https?:\/\/[^\s<>"]+/);
  if (!match) return "";
  return match[0].replace(/[),.;]+$/, "");
}

export function toIsoDate(value) {
  const match = String(value ?? "").trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

export function toTime(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function resultFromStatus(status) {
  const match = String(status).match(/^завершён:\s*(.+)$/i);
  if (!match) return undefined;
  const result = match[1].replace(/\s*\(FT\)\s*$/i, "").trim();
  return result || undefined;
}

function headerIndex(headers) {
  const index = new Map(headers.map((name, i) => [name.trim(), i]));
  for (const label of Object.values(COLUMNS)) {
    if (!index.has(label)) {
      throw new Error(`В таблице нет столбца «${label}»`);
    }
  }
  return index;
}

function cell(row, index, label) {
  return (row[index.get(label)] ?? "").trim();
}

export function rowsToMatches(table) {
  if (table.length < 2) return [];
  const index = headerIndex(table[0]);
  const matches = [];
  for (let i = 1; i < table.length; i += 1) {
    const row = table[i];
    const line = i + 1;
    const date = toIsoDate(cell(row, index, COLUMNS.date));
    const time = toTime(cell(row, index, COLUMNS.time));
    const team = cell(row, index, COLUMNS.team);
    const opponent = cell(row, index, COLUMNS.opponent);
    const tournament = cell(row, index, COLUMNS.tournament);
    const venue = cell(row, index, COLUMNS.venue);
    const status = cell(row, index, COLUMNS.status);
    const id = cell(row, index, COLUMNS.id);
    if (!date || !team || !opponent) {
      throw new Error(`Строка ${line}: нужны дата, команда и соперник`);
    }
    if (time === null) {
      throw new Error(`Строка ${line}: время «${cell(row, index, COLUMNS.time)}» не похоже на ЧЧ:ММ`);
    }
    if (venue !== "дома" && venue !== "в гостях") {
      throw new Error(`Строка ${line}: место должно быть «дома» или «в гостях»`);
    }
    const match = {
      id: id || `fixture:${team}:${date}:${opponent}`,
      date,
      time_msk: time,
      team,
      opponent,
      tournament,
      venue,
      status: status || "назначен",
      source_url: firstUrl(cell(row, index, COLUMNS.source)),
    };
    const result = resultFromStatus(match.status);
    if (result) match.result = result;
    matches.push(match);
  }
  matches.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const ta = a.time_msk || "99:99";
    const tb = b.time_msk || "99:99";
    if (ta !== tb) return ta < tb ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return matches;
}

function parseLooseJson(text) {
  const lines = String(text).replace(/^\uFEFF/, "").split(/\r?\n/);
  let start = 0;
  while (start < lines.length && !/^\s*[\[{]/.test(lines[start]) && !/setResponse/.test(lines[start])) {
    start += 1;
  }
  let body = lines.slice(start).join("\n").trim().replace(/;\s*$/, "");
  const wrapped = body.match(/setResponse\((\{[\s\S]*\})\)\s*$/);
  if (wrapped) body = wrapped[1];
  const data = JSON.parse(body);
  if (Array.isArray(data)) return objectsToTable(data);
  if (data?.table?.cols && data?.table?.rows) {
    const headers = data.table.cols.map((col) => col.label || col.id || "");
    const rows = data.table.rows.map((row) =>
      headers.map((_, i) => {
        const item = row.c?.[i];
        return String(item?.f ?? item?.v ?? "");
      }),
    );
    return [headers, ...rows];
  }
  throw new Error("JSON не похож на строки вкладки «Расписание»");
}

function objectsToTable(rows) {
  const headers = Object.values(COLUMNS);
  const table = [headers];
  for (const row of rows) {
    table.push(headers.map((header) => String(row[header] ?? "")));
  }
  return table;
}

export function convertText(text) {
  const first = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? "";
  const table = first.includes("Дата") && first.includes("Команда") ? parseCsv(text) : parseLooseJson(text);
  return rowsToMatches(table);
}

function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Использование: node scripts/csv-to-schedule.mjs <файл.csv|json> [schedule.json]");
    process.exit(1);
  }
  const output = process.argv[3]
    ? path.resolve(process.argv[3])
    : path.join(ROOT, "public/data/schedule.json");
  const text = fs.readFileSync(path.resolve(input), "utf8");
  const matches = convertText(text);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(matches, null, 2)}\n`);
  console.log(`Записано ${matches.length} матчей в ${output}`);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
