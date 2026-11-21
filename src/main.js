import "./style.css";
import manifest from "./crest-manifest.json";
import { buildCalendar, downloadText, fileSlug } from "./ics.js";
import { renderApp, shiftMonth, updateCountdowns } from "./render.js";
import { applyFilter, compareMatches, featuredMatch, isOnCalendarList, loadSchedule, moscowParts } from "./schedule.js";
import { loadPrefs, savePrefs } from "./storage.js";
import { teamBySheetName, TEAMS } from "./teams.js";
import {
  haptic,
  initTelegram,
  openChannel,
  openExternal,
  shareMatch,
  syncChrome,
} from "./telegram.js";

const app = document.getElementById("app");
const opening = moscowParts();
const allTeams = TEAMS.map((team) => team.id);

const state = {
  status: "loading",
  error: "",
  matches: [],
  tab: "home",
  view: null,
  year: opening.year,
  month: opening.month,
  mode: "month",
  filter: allTeams.slice(),
  favourites: [],
  onMain: null,
  keepScroll: false,
};

let depth = 0;
let booted = false;

function parseHash(hash) {
  const raw = hash.replace(/^#\/?/, "");
  const cut = raw.indexOf("/");
  const head = decodeURIComponent(cut === -1 ? raw : raw.slice(0, cut));
  const tail = cut === -1 ? "" : decodeURIComponent(raw.slice(cut + 1));
  if (head === "calendar") return { tab: "calendar", view: null };
  if (head === "teams") return { tab: "teams", view: null };
  if (head === "more") return { tab: "more", view: null };
  if (head === "team" && tail) return { tab: "teams", view: { type: "team", id: tail } };
  if (head === "day" && /^\d{4}-\d{2}-\d{2}$/.test(tail)) {
    return { tab: "calendar", view: { type: "day", date: tail } };
  }
  if (head === "match" && tail) return { tab: null, view: { type: "match", id: tail } };
  return { tab: "home", view: null };
}

function applyRoute() {
  const parsed = parseHash(location.hash);
  if (parsed.view?.type === "match") {
    if (!booted) state.tab = "calendar";
    state.view = parsed.view;
  } else {
    state.tab = parsed.tab;
    state.view = parsed.view;
  }
  if (state.view?.type === "day") {
    const [year, month] = state.view.date.split("-").map(Number);
    state.year = year;
    state.month = month;
  }
  booted = true;
}

function parentHash() {
  if (state.view?.type === "team" || state.tab === "teams") return "teams";
  if (state.tab === "calendar" || state.view?.type === "day") return "calendar";
  if (state.tab === "more") return "more";
  return "";
}

function go(hash, mode) {
  const url = `#/${hash}`;
  if (mode === "push") {
    depth += 1;
    history.pushState({ app: true }, "", url);
  } else {
    history.replaceState({ app: true }, "", url);
  }
  applyRoute();
  render();
}

function goBack() {
  haptic("light");
  if (depth > 0) {
    history.back();
    return;
  }
  depth = 0;
  go(parentHash(), "replace");
}

function openTab(tab) {
  depth = 0;
  go(tab === "home" ? "" : tab, "replace");
}

function persist() {
  savePrefs({ filter: state.filter, favourites: state.favourites });
}

function upcomingFor(matches) {
  return matches.filter((match) => isOnCalendarList(match)).sort(compareMatches);
}

function saveMatches(matches, filename) {
  if (matches.length === 0) return;
  downloadText(filename, buildCalendar(matches));
  haptic("medium");
}

function mainSpec() {
  if (state.status !== "ready") return null;
  if (state.view?.type === "match") {
    const match = state.matches.find((item) => item.id === state.view.id);
    if (!match) return null;
    return { text: "В календарь", run: () => saveMatches([match], `avarifc-${fileSlug(match)}.ics`) };
  }
  if (state.view?.type === "team") {
    const teamId = state.view.id;
    return {
      text: "Матчи команды",
      run: () => {
        const matches = upcomingFor(state.matches.filter((match) => teamBySheetName(match.team)?.id === teamId));
        saveMatches(matches, `avarifc-${teamId}.ics`);
      },
    };
  }
  if (!state.view && (state.tab === "home" || state.tab === "more")) {
    return { text: "Открыть канал", run: () => openChannel() };
  }
  if (!state.view && state.tab === "calendar") {
    return { text: "Скачать .ics", run: () => saveMatches(upcomingFor(applyFilter(state.matches, state.filter)), "avarifc-upcoming.ics") };
  }
  return null;
}

function render() {
  const previous = app.querySelector(".main");
  const scroll = state.keepScroll ? previous?.scrollTop ?? 0 : 0;
  state.keepScroll = false;
  const spec = mainSpec();
  state.onMain = spec?.run ?? null;
  app.innerHTML = renderApp(state, manifest, Date.now());
  if (scroll) {
    const main = app.querySelector(".main");
    if (main) main.scrollTop = scroll;
  }
  syncChrome(spec, Boolean(state.view));
  updateCountdowns(Date.now());
  lastFeatured = featuredKey();
}

function featuredKey() {
  const pool = state.filter.length === allTeams.length ? state.matches : applyFilter(state.matches, state.filter);
  const featured = featuredMatch(pool);
  return featured ? `${featured.match.id}:${featured.phase}` : "none";
}

app.addEventListener("click", (event) => {
  const el = event.target.closest("[data-action]");
  if (!el || !app.contains(el) || el.hasAttribute("disabled")) return;
  const action = el.dataset.action;
  if (action === "nav") {
    event.preventDefault();
    haptic("select");
    go(el.dataset.hash, "push");
    return;
  }
  if (action === "tab") {
    haptic("select");
    openTab(el.dataset.tab);
    return;
  }
  if (action === "month") {
    haptic("light");
    const next = shiftMonth(state.year, state.month, Number(el.dataset.dir));
    state.year = next.year;
    state.month = next.month;
    render();
    return;
  }
  if (action === "mode") {
    haptic("select");
    state.mode = el.dataset.mode === "list" ? "list" : "month";
    render();
    return;
  }
  if (action === "filter") {
    haptic("light");
    const id = el.dataset.team;
    state.filter = state.filter.includes(id) ? state.filter.filter((item) => item !== id) : [...state.filter, id];
    persist();
    state.keepScroll = true;
    render();
    return;
  }
  if (action === "filter-all") {
    haptic("light");
    state.filter = allTeams.slice();
    persist();
    state.keepScroll = true;
    render();
    return;
  }
  if (action === "fav") {
    const id = el.dataset.team;
    const has = state.favourites.includes(id);
    state.favourites = has ? state.favourites.filter((item) => item !== id) : [...state.favourites, id];
    persist();
    haptic(has ? "light" : "success");
    state.keepScroll = true;
    render();
    return;
  }
  if (action === "channel") {
    haptic("medium");
    openChannel();
    return;
  }
  if (action === "link") {
    haptic("light");
    openExternal(el.dataset.url);
    return;
  }
  if (action === "share") {
    const match = state.matches.find((item) => item.id === el.dataset.id);
    if (!match) return;
    haptic("light");
    shareMatch(match);
    return;
  }
  if (action === "ics-one") {
    const match = state.matches.find((item) => item.id === el.dataset.id);
    if (!match) return;
    saveMatches([match], `avarifc-${fileSlug(match)}.ics`);
    return;
  }
  if (action === "ics-filter") {
    saveMatches(upcomingFor(applyFilter(state.matches, state.filter)), "avarifc-upcoming.ics");
    return;
  }
  if (action === "ics-team") {
    const teamId = el.dataset.team;
    const matches = upcomingFor(state.matches.filter((match) => teamBySheetName(match.team)?.id === teamId));
    saveMatches(matches, `avarifc-${teamId}.ics`);
    return;
  }
  if (action === "retry") {
    boot();
  }
});

document.addEventListener(
  "error",
  (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    const wrap = img.closest(".crest");
    if (!wrap || wrap.classList.contains("crest-fallback")) return;
    wrap.classList.add("crest-fallback");
    wrap.textContent = wrap.dataset.fallback || "";
  },
  true,
);

window.addEventListener("popstate", () => {
  if (depth > 0) depth -= 1;
  applyRoute();
  render();
});

window.addEventListener("hashchange", () => {
  applyRoute();
  render();
});

async function boot() {
  state.status = "loading";
  render();
  try {
    const [matches, prefs] = await Promise.all([loadSchedule(), loadPrefs()]);
    state.matches = matches;
    state.filter = prefs.filter ?? allTeams.slice();
    state.favourites = prefs.favourites ?? [];
    state.status = "ready";
  } catch {
    state.status = "error";
    state.error = "Не удалось загрузить расписание. Проверьте файл data/schedule.json и обновите страницу.";
  }
  render();
}

let lastFeatured = "";

initTelegram({
  onBack: goBack,
  onMain: () => state.onMain?.(),
});
applyRoute();
boot();

setInterval(() => {
  if (state.status !== "ready") return;
  const next = featuredKey();
  if (next !== lastFeatured) {
    lastFeatured = next;
    render();
    return;
  }
  updateCountdowns(Date.now());
}, 1000);
