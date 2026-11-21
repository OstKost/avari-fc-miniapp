import { displayTeamName } from "./teams.js";
import { formatFullDate } from "./format.js";

const CHANNEL = "https://t.me/AvariFC";

function escapeText(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\n|\r/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function fold(line) {
  const encoder = new TextEncoder();
  const parts = [];
  let current = "";
  let bytes = 0;
  const limit = 73;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > limit && current) {
      parts.push(current);
      current = ` ${char}`;
      bytes = 1 + size;
    } else {
      current += char;
      bytes += size;
    }
  }
  if (current) parts.push(current);
  return parts.join("\r\n");
}

function utcStamp(ms) {
  const date = new Date(ms);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function moscowStamp(date, time) {
  const [year, month, day] = date.split("-");
  const [hours, minutes] = time.split(":");
  return `${year}${month}${day}T${hours}${minutes}00`;
}

function moscowEnd(date, time, hoursToAdd) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const utc = Date.UTC(year, month - 1, day, hours - 3, minutes) + hoursToAdd * 60 * 60 * 1000;
  const moscow = new Date(utc + 3 * 60 * 60 * 1000);
  const pad = (value) => String(value).padStart(2, "0");
  return `${moscow.getUTCFullYear()}${pad(moscow.getUTCMonth() + 1)}${pad(moscow.getUTCDate())}T${pad(moscow.getUTCHours())}${pad(moscow.getUTCMinutes())}00`;
}

export function eventLines(match, now = Date.now()) {
  const title = `${displayTeamName(match.team)} — ${match.opponent}`;
  const description = [
    title,
    match.tournament,
    match.venue,
    match.time_msk ? `${match.time_msk} МСК` : "время не назначено",
    match.status,
    match.result,
    match.source_url,
    `Канал: ${CHANNEL}`,
  ]
    .filter(Boolean)
    .join("\n");
  const lines = [
    "BEGIN:VEVENT",
    `UID:${match.id}@avarifc`,
    `DTSTAMP:${utcStamp(now)}`,
  ];
  if (match.time_msk) {
    lines.push(`DTSTART;TZID=Europe/Moscow:${moscowStamp(match.date, match.time_msk)}`);
    lines.push(`DTEND;TZID=Europe/Moscow:${moscowEnd(match.date, match.time_msk, 2)}`);
  } else {
    const compact = match.date.replaceAll("-", "");
    lines.push(`DTSTART;VALUE=DATE:${compact}`);
  }
  lines.push(`SUMMARY:${escapeText(title)}`);
  lines.push(`LOCATION:${escapeText(match.venue)}`);
  lines.push(`DESCRIPTION:${escapeText(description)}`);
  if (match.source_url) lines.push(`URL:${match.source_url}`);
  lines.push("END:VEVENT");
  return lines;
}

function calendarBody(events, now) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Avari FC//Calendar//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Avari FC",
    "X-WR-TIMEZONE:Europe/Moscow",
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Moscow",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0300",
    "TZOFFSETTO:+0300",
    "TZNAME:MSK",
    "END:STANDARD",
    "END:VTIMEZONE",
    ...events.flatMap((match) => eventLines(match, now)),
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

export function buildCalendar(matches, now = Date.now()) {
  return calendarBody(matches, now);
}

export function fileSlug(match) {
  const team = displayTeamName(match.team)
    .toLowerCase()
    .replaceAll(" ", "-");
  const opponent = match.opponent.toLowerCase().replaceAll(" ", "-");
  return `${team}-${opponent}-${match.date}`.replace(/[^a-z0-9а-яё._-]+/gi, "");
}

export function downloadText(filename, content) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function shareText(match) {
  const when = `${formatFullDate(match.date)}${match.time_msk ? `, ${match.time_msk} МСК` : ""}`;
  return [
    `${displayTeamName(match.team)} — ${match.opponent}`,
    when,
    match.tournament,
    match.venue,
    match.result,
    "Avari FC · https://t.me/AvariFC",
  ]
    .filter(Boolean)
    .join("\n");
}
