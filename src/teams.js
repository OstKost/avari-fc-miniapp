export const TEAMS = [
  { id: "arsenal", name: "Арсенал", aliases: ["Арсенал"], color: "#EF0107" },
  { id: "barcelona", name: "Барселона", aliases: ["Барселона"], color: "#A50044" },
  { id: "real", name: "Реал Мадрид", aliases: ["Реал Мадрид"], color: "#C9A227" },
  { id: "galatasaray", name: "Галатасарай", aliases: ["Галатасарай"], color: "#C8102E" },
  { id: "rostov", name: "Ростов", aliases: ["Ростов"], color: "#1E4E9E" },
  { id: "psg", name: "ПСЖ", aliases: ["ПСЖ"], color: "#004170" },
  { id: "spain", name: "сборная Испании", aliases: ["Испания", "сборная Испании"], color: "#C60B1E" },
  { id: "france", name: "сборная Франции", aliases: ["Франция", "сборная Франции"], color: "#002395" },
];

const OPPONENT_CRESTS = {
  Италия: "italy",
  Чехия: "czechia",
  Англия: "england",
  Турция: "turkey",
  "Крылья Советов": "krylia",
  Самсунспор: "samsunspor",
  Ницца: "nice",
  Ньюкасл: "newcastle",
  Сельта: "celta",
  Вильярреал: "villarreal",
  "Астон Вилла": "aston-villa",
  "Боруссия Дортмунд": "dortmund",
  ПСВ: "psv",
  Локомотив: "lokomotiv",
  Сабах: "sabah",
  Рома: "roma",
  Лорьян: "lorient",
  Алавес: "alaves",
  Краснодар: "krasnodar",
  Депортиво: "deportivo",
  "Манчестер Сити": "man-city",
  Бешикташ: "besiktas",
  "Реал Сосьедад": "sociedad",
  Брентфорд: "brentford",
  Атлетико: "atletico",
  Ризеспор: "rizespor",
  Тулуза: "toulouse",
  Факел: "fakel",
  Тоттенхэм: "tottenham",
  Атлетик: "athletic",
  АЕК: "aek",
};

const OPPONENT_COLORS = {
  Италия: "#1B4F8A",
  Чехия: "#B01018",
  Англия: "#1A2744",
  Турция: "#C8102E",
  "Крылья Советов": "#0A4EA3",
  Самсунспор: "#C8102E",
  Ницца: "#8C1D18",
  Ньюкасл: "#241F20",
  Сельта: "#5B8FBF",
  Вильярреал: "#C4A000",
  "Астон Вилла": "#670E36",
  "Боруссия Дортмунд": "#C9A000",
  ПСВ: "#C8102E",
  Локомотив: "#C8102E",
  Сабах: "#5B2C8A",
  Рома: "#8E1F2F",
  Лорьян: "#D35400",
  Алавес: "#0A4F9A",
  Краснодар: "#1B6B38",
  Депортиво: "#0A3D8F",
  "Манчестер Сити": "#1B4F82",
  Бешикташ: "#1A1A1A",
  "Реал Сосьедад": "#0057A8",
  Брентфорд: "#C8102E",
  Атлетико: "#B01E1E",
  Ризеспор: "#1F6B3A",
  Тулуза: "#5C2D86",
  Факел: "#D35400",
  Тоттенхэм: "#132257",
  Атлетик: "#C8102E",
  АЕК: "#C9A000",
};

const FALLBACK_PALETTE = ["#1F6F54", "#1D4E89", "#8A3E3E", "#6B4C2A", "#3E4C6B", "#245C4A", "#7A3E5C", "#3F5C2E"];

export function teamById(id) {
  return TEAMS.find((team) => team.id === id) ?? null;
}

export function teamBySheetName(name) {
  return TEAMS.find((team) => team.aliases.includes(name) || team.name === name) ?? null;
}

export function displayTeamName(name) {
  return teamBySheetName(name)?.name ?? name;
}

export function initials(name) {
  const parts = String(name)
    .replace(/[«»"']/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("ru");
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase("ru");
}

export function inkFor(hex) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.64 ? "#1c1408" : "#ffffff";
}

function fallbackColor(name) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

export function sideMeta(name, manifest) {
  const team = teamBySheetName(name);
  if (team) {
    return {
      name: team.name,
      color: team.color,
      ink: inkFor(team.color),
      file: manifest[team.id]?.file ?? null,
      tracked: true,
      id: team.id,
    };
  }
  const key = OPPONENT_CRESTS[name];
  const color = OPPONENT_COLORS[name] ?? fallbackColor(name);
  return {
    name,
    color,
    ink: inkFor(color),
    file: key ? manifest[key]?.file ?? null : null,
    tracked: false,
    id: key ?? null,
  };
}

export function matchSides(match, manifest) {
  const us = sideMeta(match.team, manifest);
  const them = sideMeta(match.opponent, manifest);
  if (match.venue === "в гостях") return { home: them, away: us, tracked: us };
  return { home: us, away: them, tracked: us };
}
