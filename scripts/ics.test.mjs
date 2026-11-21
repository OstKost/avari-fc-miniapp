import assert from "node:assert/strict";
import test from "node:test";
import { buildCalendar, shareText } from "../src/ics.js";
import { featuredMatch, phaseOf } from "../src/schedule.js";

const sample = {
  id: "fixture:galatasaray:2026-11-21:samsunspor",
  date: "2026-11-21",
  time_msk: "16:00",
  team: "Галатасарай",
  opponent: "Самсунспор",
  tournament: "Суперлига Турции",
  venue: "дома",
  status: "назначен",
  source_url: "https://www.tff.org/default.aspx?pageID=600",
};

test("ics uses Moscow time and folds long lines", () => {
  const ics = buildCalendar([sample], Date.UTC(2026, 10, 21, 6, 0, 0));
  assert.match(ics, /DTSTART;TZID=Europe\/Moscow:20261121T160000/);
  assert.match(ics, /DTEND;TZID=Europe\/Moscow:20261121T180000/);
  assert.match(ics, /SUMMARY:Галатасарай — Самсунспор/);
  assert.match(ics, /\r\n/);
  assert.ok(!ics.split("\r\n").some((line) => new TextEncoder().encode(line).length > 75));
});

test("featured match skips a kickoff that already passed", () => {
  const now = Date.UTC(2026, 10, 21, 7, 0, 0);
  const matches = [
    { ...sample, id: "past", date: "2026-11-20", time_msk: "19:30", team: "Ростов", opponent: "Крылья Советов" },
    sample,
  ];
  const featured = featuredMatch(matches, now);
  assert.equal(featured.match.id, sample.id);
  assert.equal(featured.phase, "upcoming");
  assert.equal(phaseOf(matches[0], now), "past");
});

test("share text is russian and names the channel", () => {
  const text = shareText(sample);
  assert.match(text, /Галатасарай — Самсунспор/);
  assert.match(text, /16:00 МСК/);
  assert.match(text, /t\.me\/AvariFC/);
});
