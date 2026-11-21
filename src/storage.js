import { TEAMS } from "./teams.js";

const FILTER_KEY = "avarifc.filter";
const FAV_KEY = "avarifc.favourites";
export const CLOUD_TIMEOUT_MS = 1500;

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

function parseStored(raw) {
  if (!raw) return null;
  try {
    return knownIds(JSON.parse(raw));
  } catch {
    return null;
  }
}

function cloudStorage() {
  try {
    const tg = window.Telegram?.WebApp;
    if (!tg?.CloudStorage) return null;
    if (typeof tg.isVersionAtLeast !== "function" || !tg.isVersionAtLeast("6.9")) return null;
    const storage = tg.CloudStorage;
    if (!storage || typeof storage.getItems !== "function" || typeof storage.setItem !== "function") return null;
    if (tg.initData) return storage;
    if (tg.platform && tg.platform !== "unknown") return storage;
    return null;
  } catch {
    return null;
  }
}

function cloudGet(storage, keys, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    try {
      storage.getItems(keys, (error, values) => {
        finish(error ? null : values ?? null);
      });
    } catch {
      finish(null);
    }
  });
}

function cloudSet(storage, key, value) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, CLOUD_TIMEOUT_MS);
    try {
      storage.setItem(key, value, () => finish());
    } catch {
      finish();
    }
  });
}

export function loadPrefs() {
  return {
    filter: readLocal(FILTER_KEY),
    favourites: readLocal(FAV_KEY),
  };
}

export async function syncCloudPrefs({ timeoutMs = CLOUD_TIMEOUT_MS } = {}) {
  const storage = cloudStorage();
  if (!storage) return null;
  try {
    const values = await cloudGet(storage, [FILTER_KEY, FAV_KEY], timeoutMs);
    if (!values) return null;
    return {
      filter: parseStored(values[FILTER_KEY]),
      favourites: parseStored(values[FAV_KEY]),
    };
  } catch {
    return null;
  }
}

export function savePrefs(prefs, options = {}) {
  try {
    writeLocal(FILTER_KEY, prefs.filter);
    writeLocal(FAV_KEY, prefs.favourites);
  } catch {
    /* private mode */
  }
  if (options.cloud === false) return;
  const storage = cloudStorage();
  if (!storage) return;
  void cloudSet(storage, FILTER_KEY, JSON.stringify(prefs.filter ?? []));
  void cloudSet(storage, FAV_KEY, JSON.stringify(prefs.favourites ?? []));
}
