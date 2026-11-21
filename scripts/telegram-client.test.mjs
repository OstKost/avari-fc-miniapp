import assert from "node:assert/strict";
import test from "node:test";
import { initTelegram, syncChrome } from "../src/telegram.js";

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

function installDocument() {
  globalThis.document = {
    documentElement: {
      dataset: {},
      style: { setProperty() {}, colorScheme: "" },
    },
    querySelector() {
      return { setAttribute() {} };
    },
  };
}

function installClient(version, extra = {}) {
  installDocument();
  globalThis.window = globalThis;
  const calls = { ready: 0, expand: 0, header: 0, back: 0, main: 0 };
  globalThis.Telegram = {
    WebApp: {
      initData: "query_id=test",
      platform: "android",
      version,
      colorScheme: "dark",
      themeParams: { bg_color: "#10231c" },
      isVersionAtLeast(needed) {
        return compareVersion(version, needed);
      },
      ready() {
        calls.ready += 1;
        if (extra.readyThrows) throw new Error("ready");
      },
      expand() {
        calls.expand += 1;
        if (extra.expandThrows) throw new Error("expand");
      },
      setHeaderColor() {
        calls.header += 1;
        if (extra.headerThrows) throw new Error("header");
      },
      setBackgroundColor() {
        if (extra.backgroundThrows) throw new Error("background");
      },
      onEvent() {
        if (extra.eventThrows) throw new Error("event");
      },
      get BackButton() {
        if (extra.backThrows) throw new Error("back");
        return {
          onClick() {
            calls.back += 1;
          },
          show() {},
          hide() {},
        };
      },
      get MainButton() {
        if (extra.mainThrows) throw new Error("main");
        return {
          onClick() {
            calls.main += 1;
          },
          show() {},
          hide() {},
          setParams() {
            calls.params = (calls.params ?? 0) + 1;
          },
        };
      },
      get HapticFeedback() {
        if (extra.hapticThrows) throw new Error("haptic");
        return {};
      },
    },
  };
  return calls;
}

test("old client cannot throw before the schedule renders", () => {
  const calls = installClient("6.0", {
    readyThrows: true,
    expandThrows: true,
    headerThrows: true,
    backgroundThrows: true,
    eventThrows: true,
    backThrows: true,
    mainThrows: true,
    hapticThrows: true,
  });
  assert.doesNotThrow(() => initTelegram({ onBack() {}, onMain() {} }));
  assert.doesNotThrow(() => syncChrome({ text: "Открыть канал" }, true));
  assert.equal(calls.header, 0);
  assert.equal(calls.back, 0);
  assert.equal(calls.main, 0);
  assert.equal(document.documentElement.dataset.theme, "dark");
});

test("a 6.9 client still receives ready, theme and buttons", () => {
  const calls = installClient("6.9");
  initTelegram({ onBack() {}, onMain() {} });
  syncChrome({ text: "Открыть канал" }, false);
  assert.equal(calls.ready, 1);
  assert.equal(calls.expand, 1);
  assert.equal(calls.header, 1);
  assert.equal(calls.back, 1);
  assert.equal(calls.main, 1);
  assert.equal(calls.params, 1);
});
