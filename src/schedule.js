import { teamBySheetName } from "./teams.js";

const WINDOW_MS = 115 * 60 * 1000;

export function moscowParts(date = new Date()) {
  const shifted = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { year, month, day, key };
}

export function dateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function monthCells(year, month) {
  const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let day = 1; day <= count; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function matchKickoffMs(match) {
  if (!match.time_msk) return null;
  const [year, month, day] = match.date.split("-").map(Number);
  const [hours, minutes] = match.time_msk.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hours - 3, minutes, 0, 0);
}

export function statusKind(status) {
  const value = String(status ?? "").trim().toLowerCase();
  if (value.startsWith("заверш")) return "finished";
  if (value.startsWith("предвар")) return "tentative";
  return "scheduled";
}

export function phaseOf(match, now = Date.now()) {
  const kind = statusKind(match.status);
  if (kind === "finished") return "finished";
  const kickoff = matchKickoffMs(match);
  const today = moscowParts(new Date(now)).key;
  if (kickoff == null) {
    if (match.date < today) return "past";
    return kind === "tentative" ? "tentative" : "upcoming";
  }
  const elapsed = now - kickoff;
  if (elapsed < 0) return kind === "tentative" ? "tentative" : "upcoming";
  if (elapsed < WINDOW_MS) return "inprogress";
  return "past";
}

export function isOnCalendarList(match, now = Date.now()) {
  const phase = phaseOf(match, now);
  return phase === "upcoming" || phase === "tentative" || phase === "inprogress";
}

export function compareMatches(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  const timeA = a.time_msk || "99:99";
  const timeB = b.time_msk || "99:99";
  if (timeA !== timeB) return timeA < timeB ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function applyFilter(matches, filterIds) {
  const selected = new Set(filterIds);
  return matches.filter((match) => {
    const team = teamBySheetName(match.team);
    return team ? selected.has(team.id) : false;
  });
}

export function featuredMatch(matches, now = Date.now()) {
  const list = matches.filter((match) => isOnCalendarList(match, now)).sort(compareMatches);
  if (list.length === 0) return null;
  const match = list[0];
  return { match, phase: phaseOf(match, now) };
}

export const SCHEDULE_TIMEOUT_MS = 10_000;

function buildId() {
  return typeof __AVARI_BUILD__ === "string" && __AVARI_BUILD__ ? __AVARI_BUILD__ : "dev";
}

function scheduleUrl(build) {
  const base = import.meta.env?.BASE_URL || "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}data/schedule.json?v=${encodeURIComponent(build || buildId())}`;
}

export async function loadSchedule({ timeoutMs = SCHEDULE_TIMEOUT_MS, build = "" } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(scheduleUrl(build), { signal: controller.signal });
    if (!response.ok) throw new Error("http");
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("format");
    return data.slice().sort(compareMatches);
  } finally {
    clearTimeout(timer);
  }
}
