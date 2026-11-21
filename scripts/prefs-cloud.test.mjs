import assert from "node:assert/strict";
import test from "node:test";
import { CLOUD_TIMEOUT_MS, loadPrefs, savePrefs, syncCloudPrefs } from "../src/storage.js";

function compareVersion(current, needed) {
  const parse = (value) => String(value).split(".").map((part) => Number(part) || 0);
  const left = parse(current);
  const right = parse(needed);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta !== 0) return delta >= 0;
  }
  return true;
}

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
}

function installWebApp(options = {}) {
  const version = options.version ?? "7.2";
  const calls = { getItems: 0, setItem: 0 };
  globalThis.window = globalThis;
  globalThis.localStorage = memoryStorage();
  globalThis.Telegram = {
    WebApp: {
      initData: options.initData ?? "query_id=test",
      platform: options.platform ?? "tdesktop",
      version,
      isVersionAtLeast(needed) {
        return compareVersion(version, needed);
      },
      CloudStorage: {
        getItems(_keys, _callback) {
          calls.getItems += 1;
        },
        setItem(_key, _value, _callback) {
          calls.setItem += 1;
        },
      },
    },
  };
  return calls;
}

test("loadPrefs returns local settings while CloudStorage never answers", { timeout: 2000 }, async () => {
  const calls = installWebApp({ version: "7.2" });
  localStorage.setItem("avarifc.filter", JSON.stringify(["arsenal"]));
  localStorage.setItem("avarifc.favourites", JSON.stringify(["psg"]));
  const started = Date.now();
  const prefs = await loadPrefs();
  assert.ok(Date.now() - started < 1500);
  assert.deepEqual(prefs.filter, ["arsenal"]);
  assert.deepEqual(prefs.favourites, ["psg"]);
  assert.equal(calls.getItems, 0);
});

test("savePrefs skips CloudStorage below version 6.9", () => {
  const calls = installWebApp({ version: "6.4" });
  savePrefs({ filter: ["arsenal"], favourites: [] });
  assert.equal(calls.setItem, 0);
  assert.deepEqual(JSON.parse(localStorage.getItem("avarifc.filter")), ["arsenal"]);
});

test("cloud timeout is about 1.5 seconds", () => {
  assert.equal(CLOUD_TIMEOUT_MS, 1500);
});

test("syncCloudPrefs gives up when getItems never calls back", { timeout: 2500 }, async () => {
  const calls = installWebApp({ version: "7.2" });
  const started = Date.now();
  const cloud = await syncCloudPrefs();
  const elapsed = Date.now() - started;
  assert.equal(calls.getItems, 1);
  assert.equal(cloud, null);
  assert.ok(elapsed >= 1400, `too fast: ${elapsed}`);
  assert.ok(elapsed < 2000, `too slow: ${elapsed}`);
});

test("syncCloudPrefs reads a callback and ignores unknown teams", async () => {
  installWebApp({ version: "6.9" });
  window.Telegram.WebApp.CloudStorage.getItems = (_keys, callback) => {
    callback(null, {
      "avarifc.filter": JSON.stringify(["real", "nope"]),
      "avarifc.favourites": JSON.stringify(["spain"]),
    });
  };
  const cloud = await syncCloudPrefs({ timeoutMs: 200 });
  assert.deepEqual(cloud.filter, ["real"]);
  assert.deepEqual(cloud.favourites, ["spain"]);
});

test("syncCloudPrefs skips a client below 6.9 and a throwing version check", async () => {
  const calls = installWebApp({ version: "6.8" });
  assert.equal(await syncCloudPrefs({ timeoutMs: 30 }), null);
  assert.equal(calls.getItems, 0);
  window.Telegram.WebApp.version = "7.2";
  window.Telegram.WebApp.isVersionAtLeast = () => {
    throw new Error("old");
  };
  assert.equal(await syncCloudPrefs({ timeoutMs: 30 }), null);
  assert.equal(calls.getItems, 0);
  window.Telegram.WebApp.isVersionAtLeast = () => true;
  window.Telegram.WebApp.CloudStorage.getItems = () => {
    throw new Error("nope");
  };
  assert.equal(await syncCloudPrefs({ timeoutMs: 30 }), null);
});

test("savePrefs writes CloudStorage on 6.9 without waiting for the callback", () => {
  const calls = installWebApp({ version: "6.9" });
  const started = Date.now();
  savePrefs({ filter: ["psg"], favourites: ["psg"] });
  assert.ok(Date.now() - started < 200);
  assert.equal(calls.setItem, 2);
  assert.deepEqual(JSON.parse(localStorage.getItem("avarifc.favourites")), ["psg"]);
});
