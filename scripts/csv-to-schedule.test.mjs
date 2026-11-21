import assert from "node:assert/strict";
import test from "node:test";
import { convertText, firstUrl, resultFromStatus } from "./csv-to-schedule.mjs";

test("csv keeps commas inside quotes and extracts the score", () => {
  const csv = [
    "Дата,Время МСК,Команда,Соперник,Турнир,Дома/в гостях,Статус,Источник,Проверено,Live,ID",
    '12.11.2026,22:45,Франция,Италия,"Лига наций УЕФА, A1, тур 5",в гостях,завершён: Италия 3–1 Франция (FT),https://www.uefa.com/match (заметка),13.11.2026,да,fixture:france:2026-11-12:italy',
    '06.12.2026,,Барселона,Сельта,Ла Лига,дома,"предварительно, время не назначено",https://www.fcbarcelona.com/calendar,13.11.2026,да,fixture:barcelona:2026-12-06:celta',
  ].join("\n");
  const matches = convertText(csv);
  assert.equal(matches.length, 2);
  assert.equal(matches[0].date, "2026-11-12");
  assert.equal(matches[0].time_msk, "22:45");
  assert.equal(matches[0].tournament, "Лига наций УЕФА, A1, тур 5");
  assert.equal(matches[0].result, "Италия 3–1 Франция");
  assert.equal(matches[0].source_url, "https://www.uefa.com/match");
  assert.equal(matches[1].time_msk, "");
  assert.equal(matches[1].result, undefined);
  assert.equal(matches[1].status, "предварительно, время не назначено");
});

test("json export may start with a non-json line", () => {
  const body = {
    table: {
      cols: [
        { label: "Дата" },
        { label: "Время МСК" },
        { label: "Команда" },
        { label: "Соперник" },
        { label: "Турнир" },
        { label: "Дома/в гостях" },
        { label: "Статус" },
        { label: "Источник" },
        { label: "Проверено" },
        { label: "Live" },
        { label: "ID" },
      ],
      rows: [
        {
          c: [
            { v: "21.11.2026" },
            { v: "16:00" },
            { v: "Галатасарай" },
            { v: "Самсунспор" },
            { v: "Суперлига Турции" },
            { v: "дома" },
            { v: "назначен" },
            { v: "https://www.tff.org/default.aspx?pageID=600" },
            { v: "да" },
            { v: "да" },
            { v: "fixture:galatasaray:2026-11-21:samsunspor" },
          ],
        },
      ],
    },
  };
  const text = `)]}'\ngoogle.visualization.Query.setResponse(${JSON.stringify(body)});`;
  const matches = convertText(text);
  assert.equal(matches[0].id, "fixture:galatasaray:2026-11-21:samsunspor");
  assert.equal(matches[0].team, "Галатасарай");
  assert.equal(matches[0].venue, "дома");
});

test("helpers", () => {
  assert.equal(firstUrl("см. https://fc-rostov.ru/matches/6280/lineups (линия)"), "https://fc-rostov.ru/matches/6280/lineups");
  assert.equal(resultFromStatus("назначен"), undefined);
});
