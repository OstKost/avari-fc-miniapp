import { TEAMS } from "./teams.js";

const FILTER_KEY = "avarifc.filter";
const FAV_KEY = "avarifc.favourites";

function knownIds(value) {
  if (!Array.isArray(value)) return null;
  const allowed = new Set(TEAMS.map((team) => team.id));
  return value.filter((id) => allowed.has(id));
}

function readLocal(key) {
  try {
    return knownIds(JSON.parse(localStorage.getItem(key) ?? "null"));
  } catch {
    return null;
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function cloudAvailable() {
  const tg = window.Telegram?.WebApp;
  if (!tg?.CloudStorage) return false;
  if (tg.initData) return true;
  return Boolean(tg.platform && tg.platform !== "unknown");
}

function cloudGet(keys) {
  const storage = window.Telegram.WebApp.CloudStorage;
  return new Promise((resolve) => {
    storage.getItems(keys, (error, values) => {
      if (error) resolve(null);
      else resolve(values ?? null);
    });
  });
}

export async function loadPrefs() {
  const local = {
    filter: readLocal(FILTER_KEY),
    favourites: readLocal(FAV_KEY),
  };
  if (!cloudAvailable()) return local;
  try {
    const values = await cloudGet([FILTER_KEY, FAV_KEY]);
    if (!values) return local;
    const filter = values[FILTER_KEY] ? knownIds(JSON.parse(values[FILTER_KEY])) : null;
    const favourites = values[FAV_KEY] ? knownIds(JSON.parse(values[FAV_KEY])) : null;
    return {
      filter: filter ?? local.filter,
      favourites: favourites ?? local.favourites,
    };
  } catch {
    return local;
  }
}

export function savePrefs(prefs) {
  writeLocal(FILTER_KEY, prefs.filter);
  writeLocal(FAV_KEY, prefs.favourites);
  if (!cloudAvailable()) return;
  const storage = window.Telegram.WebApp.CloudStorage;
  storage.setItem(FILTER_KEY, JSON.stringify(prefs.filter), () => {});
  storage.setItem(FAV_KEY, JSON.stringify(prefs.favourites), () => {});
}
