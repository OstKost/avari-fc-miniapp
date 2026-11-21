import assert from "node:assert/strict";
import { afterEach } from "node:test";
import test from "node:test";
import { loadSchedule, SCHEDULE_TIMEOUT_MS } from "../src/schedule.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("schedule timeout is about 10 seconds", () => {
  assert.equal(SCHEDULE_TIMEOUT_MS, 10_000);
});

test("loadSchedule cache-busts the build and returns matches in order", async () => {
  let seen = "";
  globalThis.fetch = async (url, options) => {
    seen = String(url);
    assert.ok(options?.signal);
    return Response.json([
      { id: "b", date: "2026-11-22", time_msk: "12:00", team: "ПСЖ", opponent: "Ницца", status: "назначен" },
      { id: "a", date: "2026-11-21", time_msk: "16:00", team: "Галатасарай", opponent: "Самсунспор", status: "назначен" },
    ]);
  };
  const matches = await loadSchedule({ timeoutMs: 1000 });
  assert.match(seen, /\/data\/schedule\.json\?v=dev$/);
  assert.deepEqual(matches.map((match) => match.id), ["a", "b"]);
});

test("loadSchedule rejects a bad response", async () => {
  globalThis.fetch = async () => new Response("nope", { status: 503 });
  await assert.rejects(loadSchedule({ timeoutMs: 1000 }), /http/);
});

test("loadSchedule aborts a stalled fetch", async () => {
  let signal;
  globalThis.fetch = (_url, options) => {
    signal = options.signal;
    return new Promise((_resolve, reject) => {
      const abort = () => reject(new DOMException("The operation was aborted", "AbortError"));
      if (signal?.aborted) abort();
      else signal?.addEventListener("abort", abort, { once: true });
    });
  };
  const started = Date.now();
  await assert.rejects(loadSchedule({ timeoutMs: 40 }), (error) => {
    assert.equal(error.name, "AbortError");
    return true;
  });
  assert.ok(signal?.aborted);
  assert.ok(Date.now() - started < 1000);
});
