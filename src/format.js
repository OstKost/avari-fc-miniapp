const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const MONTHS_NOMINATIVE = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];

const WEEKDAYS_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const WEEKDAYS_FULL = [
  "воскресенье",
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
];

export function civilParts(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, weekday };
}

export function formatMatchDate(dateStr) {
  const { day, month, weekday } = civilParts(dateStr);
  return `${WEEKDAYS_SHORT[weekday]}, ${day} ${MONTHS_GENITIVE[month - 1]}`;
}

export function formatFullDate(dateStr) {
  const { day, month, weekday } = civilParts(dateStr);
  return `${WEEKDAYS_FULL[weekday]}, ${day} ${MONTHS_GENITIVE[month - 1]}`;
}

export function formatMonthTitle(year, month) {
  return `${MONTHS_NOMINATIVE[month - 1]} ${year}`;
}

export function formatTime(time) {
  return time ? `${time} МСК` : "время не назначено";
}

export function countdownLabel(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days} д ${hours} ч`;
  if (hours > 0) return `${hours} ч ${minutes} мин`;
  if (minutes > 0) return `${minutes} мин ${seconds} с`;
  return `${seconds} с`;
}

export function pluralMatches(count) {
  const n10 = count % 10;
  const n100 = count % 100;
  if (n10 === 1 && n100 !== 11) return `${count} матч`;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return `${count} матча`;
  return `${count} матчей`;
}

export function hostOf(url) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}
