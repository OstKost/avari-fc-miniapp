import { esc } from "./html.js";
import {
  countdownLabel,
  formatFullDate,
  formatMatchDate,
  formatMonthTitle,
  formatTime,
  hostOf,
  pluralMatches,
} from "./format.js";
import {
  applyFilter,
  dateKey,
  featuredMatch,
  isOnCalendarList,
  matchKickoffMs,
  monthCells,
  moscowParts,
  phaseOf,
  compareMatches,
} from "./schedule.js";
import { initials, matchSides, sideMeta, teamById, teamBySheetName, TEAMS } from "./teams.js";

function icon(name, filled = false) {
  const paths = {
    home: '<path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-5.2v-6.2H10.2V21H5a1 1 0 0 1-1-1z"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3.5v3M16 3.5v3M4 10h16"/>',
    shield: '<path d="M12 3.2 5 6.1v5.7c0 4.1 2.8 7 7 8.4 4.2-1.4 7-4.3 7-8.4V6.1z"/>',
    more: '<circle cx="6" cy="12" r="1.35"/><circle cx="12" cy="12" r="1.35"/><circle cx="18" cy="12" r="1.35"/>',
    back: '<path d="M14.5 5 8 12l6.5 7"/>',
    star: '<path d="m12 3.7 2.15 4.65 5.1.48-3.85 3.35 1.15 5.02L12 14.8l-4.55 2.4 1.15-5.02L4.75 8.83l5.1-.48z"/>',
  };
  const paint = filled
    ? 'fill="currentColor" stroke="none"'
    : 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"';
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" ${paint}>${paths[name]}</svg>`;
}

function crestHtml(side, size) {
  const style = `--team:${side.color};--ink:${side.ink}`;
  const letters = initials(side.name);
  if (!side.file) {
    return `<span class="crest crest-fallback" data-size="${size}" style="${style}" aria-hidden="true">${esc(letters)}</span>`;
  }
  const src = `${import.meta.env.BASE_URL}crests/${side.file}`;
  return `<span class="crest" data-size="${size}" style="${style}" data-fallback="${esc(letters)}"><img src="${esc(src)}" alt=""></span>`;
}

function sideBlock(side, size) {
  return `<span class="side">${crestHtml(side, size)}<span class="side-name">${esc(side.name)}</span></span>`;
}

function badge(phase) {
  switch (phase) {
    case "finished":
      return '<span class="pill finished">завершён</span>';
    case "tentative":
      return '<span class="pill">предварительно</span>';
    case "inprogress":
      return '<span class="pill live">уже начался</span>';
    case "past":
      return '<span class="pill past">время прошло</span>';
    case "upcoming":
      return '<span class="pill">назначен</span>';
    default:
      return "";
  }
}

function backLink(hash, label) {
  return `<a class="back" href="#/${hash}" data-action="nav" data-hash="${esc(hash)}">${icon("back")}<span>${esc(label)}</span></a>`;
}

function matchCard(match, manifest, now) {
  const sides = matchSides(match, manifest);
  const phase = phaseOf(match, now);
  const hash = `match/${encodeURIComponent(match.id)}`;
  return `<article class="card match-card" style="--team:${sides.tracked.color}">
    <a class="match-open" href="#/${hash}" data-action="nav" data-hash="${esc(hash)}">
      <div class="match-kicker">
        <time datetime="${esc(match.date)}">${esc(formatMatchDate(match.date))}</time>
        <span>${esc(formatTime(match.time_msk))}</span>
      </div>
      <div class="sides">
        ${sideBlock(sides.home, "md")}
        <span class="vs" aria-hidden="true">—</span>
        ${sideBlock(sides.away, "md")}
      </div>
      <p class="tournament">${esc(match.tournament)}</p>
      ${match.result ? `<p class="score">${esc(match.result)}</p>` : ""}
      <div class="meta">${badge(phase)}<span class="pill quiet">${esc(match.venue)}</span></div>
    </a>
  </article>`;
}

function renderHome(state, manifest, now) {
  const source = applyFilter(state.matches, state.filter);
  const featured = featuredMatch(source, now);
  const upcomingCount = source.filter((match) => isOnCalendarList(match, now)).length;
  const favs = state.favourites.map((id) => teamById(id)).filter(Boolean);
  let hero = `<section class="card empty-card"><p>В расписании нет предстоящих матчей.</p></section>`;
  if (featured) {
    const { match, phase } = featured;
    const sides = matchSides(match, manifest);
    const kick = matchKickoffMs(match);
    let countdown = `<p class="countdown countdown-small">время не назначено</p>`;
    if (phase === "inprogress") {
      countdown = `<p class="countdown-label">по расписанию</p><p class="countdown countdown-live">уже начался</p><p class="note">Live-счёт — в канале.</p>`;
    } else if (kick != null && phase !== "tentative") {
      countdown = `<p class="countdown-label">до начала</p><p class="countdown" data-countdown="${kick}">через ${esc(countdownLabel(kick - now))}</p>`;
    } else if (phase === "tentative") {
      countdown = `<p class="countdown-label">статус</p><p class="countdown countdown-small">предварительно</p>`;
    }
    const hash = `match/${encodeURIComponent(match.id)}`;
    hero = `<article class="card feature" style="--team:${sides.tracked.color}">
      <a class="feature-open" href="#/${hash}" data-action="nav" data-hash="${esc(hash)}">
        <p class="kicker">Следующий матч</p>
        <div class="sides sides-lg">
          ${sideBlock(sides.home, "lg")}
          <span class="vs" aria-hidden="true">—</span>
          ${sideBlock(sides.away, "lg")}
        </div>
        <p class="tournament">${esc(match.tournament)}</p>
        <div class="meta">
          <span class="pill quiet">${esc(formatMatchDate(match.date))}</span>
          <span class="pill quiet">${esc(formatTime(match.time_msk))}</span>
          <span class="pill quiet">${esc(match.venue)}</span>
        </div>
        ${countdown}
      </a>
      <div class="actions">
        <button class="btn btn-ghost" type="button" data-action="share" data-id="${esc(match.id)}">Поделиться</button>
        <button class="btn btn-ghost" type="button" data-action="ics-one" data-id="${esc(match.id)}">В календарь</button>
        <button class="btn btn-primary wide" type="button" data-action="channel">Открыть канал</button>
      </div>
    </article>`;
  }
  const todayKey = moscowParts(new Date(now)).key;
  const restToday = source
    .filter((match) => match.date === todayKey && isOnCalendarList(match, now) && match.id !== featured?.match.id)
    .sort(compareMatches);
  const later = source
    .filter((match) => isOnCalendarList(match, now) && match.id !== featured?.match.id && match.date !== todayKey)
    .sort(compareMatches)
    .slice(0, 3);
  const favBlock = favs.length
    ? `<h2 class="section-title">Избранные</h2><div class="fav-row">${favs
        .map((team) => {
          const side = sideMeta(team.name, manifest);
          return `<a class="fav" href="#/team/${team.id}" data-action="nav" data-hash="team/${team.id}">${crestHtml(side, "sm")}<span>${esc(team.name)}</span></a>`;
        })
        .join("")}</div>`
    : "";
  return `<p class="lede">Канал про «Арсенал», «Барселону», «Реал», «Галатасарай», «Ростов», «ПСЖ» и сборные Испании и Франции. Новости с источником и live по матчам избранных команд. Время — МСК.</p>
    ${hero}
    <button class="btn btn-ghost wide gap" type="button" data-action="ics-filter" ${upcomingCount ? "" : "disabled"}>Предстоящие выбранных команд (.ics)</button>
    ${restToday.length ? `<h2 class="section-title">Ещё сегодня</h2>${restToday.map((match) => matchCard(match, manifest, now)).join("")}` : ""}
    ${later.length ? `<h2 class="section-title">Дальше</h2>${later.map((match) => matchCard(match, manifest, now)).join("")}` : ""}
    ${favBlock}`;
}

function chipCrests(manifest) {
  return TEAMS.map((team) => {
    const side = sideMeta(team.aliases[0], manifest);
    return { id: team.id, html: crestHtml(side, "sm") };
  });
}

function renderCalendar(state, manifest, now) {
  const selected = applyFilter(state.matches, state.filter);
  const upcoming = selected.filter((match) => isOnCalendarList(match, now)).sort(compareMatches);
  const crests = Object.fromEntries(chipCrests(manifest).map((item) => [item.id, item.html]));
  const chips = `<div class="chips" role="group" aria-label="Фильтр команд">
    <button class="chip ${state.filter.length === TEAMS.length ? "on" : ""}" type="button" data-action="filter-all" aria-pressed="${state.filter.length === TEAMS.length}">Все</button>
    ${TEAMS.map((team) => {
      const on = state.filter.includes(team.id);
      return `<button class="chip ${on ? "on" : ""}" type="button" data-action="filter" data-team="${team.id}" aria-pressed="${on}" style="--team:${team.color}">${crests[team.id]}<span>${esc(team.name)}</span></button>`;
    }).join("")}
  </div>`;
  const mode = `<div class="segment" role="tablist" aria-label="Вид календаря">
    <button type="button" role="tab" aria-selected="${state.mode === "month"}" data-action="mode" data-mode="month">Сетка</button>
    <button type="button" role="tab" aria-selected="${state.mode === "list"}" data-action="mode" data-mode="list">Список</button>
  </div>`;
  const downloadDisabled = upcoming.length === 0 ? "disabled" : "";
  const download = `<button class="btn btn-ghost wide" type="button" data-action="ics-filter" ${downloadDisabled}>Скачать .ics · ${esc(pluralMatches(upcoming.length))}</button>`;
  let body = "";
  if (state.filter.length === 0) {
    body = `<div class="empty"><p>Ни одна команда не выбрана.</p><button class="btn btn-primary" type="button" data-action="filter-all">Показать все</button></div>`;
  } else if (state.mode === "list") {
    body = renderGrouped(upcoming, manifest, now, "Нет предстоящих матчей по выбранным командам.");
  } else {
    body = renderMonth(state, selected, now);
  }
  const hint = state.mode === "month"
    ? "Цветная точка — матч команды в этот день. Время на карточках — МСК."
    : "Список предстоящих матчей выбранных команд. Время — МСК.";
  return `${chips}${mode}${download}<p class="hint">${hint}</p>${body}`;
}

function renderMonth(state, matches, now) {
  const cells = monthCells(state.year, state.month);
  const today = moscowParts(new Date(now)).key;
  const byDate = new Map();
  for (const match of matches) {
    if (!byDate.has(match.date)) byDate.set(match.date, []);
    byDate.get(match.date).push(match);
  }
  const weeks = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
    .map((label) => `<span>${label}</span>`)
    .join("");
  const days = cells
    .map((day) => {
      if (!day) return '<span class="day day-empty"></span>';
      const key = dateKey(state.year, state.month, day);
      const list = byDate.get(key) ?? [];
      const seen = new Set();
      const dots = [];
      for (const match of list) {
        const team = teamBySheetName(match.team);
        if (!team || seen.has(team.id)) continue;
        seen.add(team.id);
        dots.push(`<i class="dot" style="background:${team.color}"></i>`);
      }
      const label = list.length
        ? `${day} ${formatMonthTitle(state.year, state.month)}, ${pluralMatches(list.length)}`
        : `${day} ${formatMonthTitle(state.year, state.month)}`;
      return `<button class="day ${list.length ? "has" : ""} ${key === today ? "today" : ""}" type="button" data-action="nav" data-hash="day/${key}" aria-label="${esc(label)}">
        <span class="day-num">${day}</span>
        <span class="dots">${dots.slice(0, 4).join("")}</span>
      </button>`;
    })
    .join("");
  return `<div class="month-bar">
      <button class="icon-btn" type="button" data-action="month" data-dir="-1" aria-label="Предыдущий месяц">${icon("back")}</button>
      <h2>${esc(formatMonthTitle(state.year, state.month))}</h2>
      <button class="icon-btn icon-next" type="button" data-action="month" data-dir="1" aria-label="Следующий месяц">${icon("back")}</button>
    </div>
    <div class="weekdays">${weeks}</div>
    <div class="month-grid">${days}</div>`;
}

function renderGrouped(matches, manifest, now, emptyText) {
  if (matches.length === 0) return `<p class="empty">${esc(emptyText)}</p>`;
  let html = "";
  let last = "";
  for (const match of matches) {
    if (match.date !== last) {
      html += `<h3 class="day-heading">${esc(formatFullDate(match.date))}</h3>`;
      last = match.date;
    }
    html += matchCard(match, manifest, now);
  }
  return html;
}

function renderDay(state, manifest, now) {
  const date = state.view.date;
  const matches = applyFilter(state.matches, state.filter)
    .filter((match) => match.date === date)
    .sort(compareMatches);
  return `${backLink("calendar", "Календарь")}
    <h2 class="view-title">${esc(formatFullDate(date))}</h2>
    <p class="hint">${esc(pluralMatches(matches.length))}</p>
    ${matches.length ? matches.map((match) => matchCard(match, manifest, now)).join("") : '<p class="empty">В этот день матчей выбранных команд нет.</p>'}`;
}

function renderTeams(state, manifest, now) {
  const cards = TEAMS.map((team) => {
    const side = sideMeta(team.aliases[0], manifest);
    const upcoming = state.matches
      .filter((match) => teamBySheetName(match.team)?.id === team.id && isOnCalendarList(match, now))
      .sort(compareMatches);
    const next = upcoming[0];
    const nextLine = next ? `${formatMatchDate(next.date)} · ${next.opponent}` : "ближайших матчей нет";
    const fav = state.favourites.includes(team.id);
    return `<article class="card team-tile" style="--team:${team.color}">
      <a class="team-open" href="#/team/${team.id}" data-action="nav" data-hash="team/${team.id}">
        ${crestHtml(side, "lg")}
        <span class="team-name">${esc(team.name)}</span>
        <span class="team-next">${esc(nextLine)}</span>
      </a>
      <button class="star ${fav ? "on" : ""}" type="button" data-action="fav" data-team="${team.id}" aria-pressed="${fav}" aria-label="${fav ? "Убрать из избранного" : "В избранное"}: ${esc(team.name)}">${icon("star", fav)}</button>
    </article>`;
  }).join("");
  return `<p class="lede">Восемь команд канала. Звезда сохраняется на этом устройстве и в Telegram, если доступно облако.</p><div class="team-grid">${cards}</div>`;
}

function renderTeam(state, manifest, now) {
  const team = teamById(state.view.id);
  if (!team) return `${backLink("teams", "Команды")}<p class="empty">Такой команды в списке нет.</p>`;
  const side = sideMeta(team.aliases[0], manifest);
  const own = state.matches.filter((match) => teamBySheetName(match.team)?.id === team.id);
  const upcoming = own.filter((match) => isOnCalendarList(match, now)).sort(compareMatches);
  const recent = own.filter((match) => !isOnCalendarList(match, now)).sort((a, b) => compareMatches(b, a));
  const fav = state.favourites.includes(team.id);
  return `${backLink("teams", "Команды")}
    <header class="team-hero" style="--team:${team.color}">
      ${crestHtml(side, "lg")}
      <div>
        <h2 class="view-title">${esc(team.name)}</h2>
        <button class="btn btn-ghost" type="button" data-action="fav" data-team="${team.id}" aria-pressed="${fav}">${fav ? "В избранном" : "В избранное"}</button>
      </div>
    </header>
    <button class="btn btn-ghost wide gap" type="button" data-action="ics-team" data-team="${team.id}" ${upcoming.length ? "" : "disabled"}>Скачать предстоящие .ics</button>
    <h3 class="section-title">Ближайшие</h3>
    ${upcoming.length ? upcoming.map((match) => matchCard(match, manifest, now)).join("") : '<p class="empty">Ближайших матчей в расписании нет.</p>'}
    <h3 class="section-title">Уже сыгранные и прошедшие</h3>
    ${recent.length ? recent.map((match) => matchCard(match, manifest, now)).join("") : '<p class="empty">Прошедших матчей в файле расписания нет.</p>'}`;
}

function renderMatch(state, manifest, now) {
  const match = state.matches.find((item) => item.id === state.view.id);
  const parent = state.tab === "teams" ? "teams" : state.tab === "home" ? "" : "calendar";
  const parentLabel = state.tab === "teams" ? "Команды" : state.tab === "home" ? "Главная" : "Календарь";
  if (!match) return `${backLink(parent, parentLabel)}<p class="empty">Матч не найден.</p>`;
  const sides = matchSides(match, manifest);
  const phase = phaseOf(match, now);
  const kick = matchKickoffMs(match);
  const countdown = kick != null && (phase === "upcoming" || phase === "tentative")
    ? `<p class="countdown" data-countdown="${kick}">через ${esc(countdownLabel(kick - now))}</p>`
    : "";
  const source = match.source_url
    ? `<button class="link-row" type="button" data-action="link" data-url="${esc(match.source_url)}"><span>Источник</span><span class="host">${esc(hostOf(match.source_url))}</span></button>`
    : "";
  return `${backLink(parent, parentLabel)}
    <article class="card feature" style="--team:${sides.tracked.color}">
      <div class="feature-body">
        <div class="sides sides-lg">
          ${sideBlock(sides.home, "lg")}
          <span class="vs" aria-hidden="true">—</span>
          ${sideBlock(sides.away, "lg")}
        </div>
        <p class="tournament">${esc(match.tournament)}</p>
        <div class="meta">
          ${badge(phase)}
          <span class="pill quiet">${esc(match.venue)}</span>
          <span class="pill quiet">${esc(formatTime(match.time_msk))}</span>
        </div>
        <p class="when">${esc(formatFullDate(match.date))}</p>
        ${match.result ? `<p class="score">${esc(match.result)}</p>` : ""}
        ${countdown}
        <p class="status-full">${esc(match.status)}</p>
        ${source}
      </div>
      <div class="actions">
        <button class="btn btn-ghost" type="button" data-action="share" data-id="${esc(match.id)}">Поделиться</button>
        <button class="btn btn-primary" type="button" data-action="ics-one" data-id="${esc(match.id)}">В календарь</button>
      </div>
    </article>`;
}

function renderMore() {
  const avatar = `${import.meta.env.BASE_URL}avatar.jpg`;
  return `<img class="about-avatar" src="${esc(avatar)}" alt="Аватар канала Avari FC">
    <h2 class="view-title center">О канале</h2>
    <p class="lede">Avari FC — болельщицкий канал. Следим за «Арсеналом», «Барселоной», «Реалом», «Галатасараем», «Ростовом», «ПСЖ» и сборными Испании и Франции.</p>
    <section class="card prose">
      <h3>Как выходят материалы</h3>
      <ul>
        <li>Новости публикуются с указанием источника.</li>
        <li>Live — по матчам избранных команд, в самом канале.</li>
        <li>Время в этом приложении московское, подпись «МСК».</li>
      </ul>
      <h3>Это приложение</h3>
      <p>Календарь и карточки матчей. Матч можно отправить в чат или сохранить файлом .ics в календарь телефона. Отдельные напоминания отсюда не ставятся.</p>
      <p>Гербы клубов и сборных стоят для узнаваемости. Права на знаки остаются у клубов и федераций.</p>
    </section>
    <div class="card link-card">
      <button class="link-row" type="button" data-action="channel"><span>Канал @AvariFC</span><span class="host">t.me/AvariFC</span></button>
      <button class="link-row" type="button" data-action="link" data-url="https://t.me/AvariFCBot"><span>Бот @AvariFCBot</span><span class="host">t.me/AvariFCBot</span></button>
    </div>`;
}

function shell(state, content) {
  const avatar = `${import.meta.env.BASE_URL}avatar.jpg`;
  const tabs = [
    ["home", "Главная", "home"],
    ["calendar", "Календарь", "calendar"],
    ["teams", "Команды", "shield"],
    ["more", "Ещё", "more"],
  ]
    .map(([id, label, glyph]) => {
      const current = state.tab === id && !state.view ? "page" : "false";
      const pressed = state.tab === id ? "true" : "false";
      return `<button class="tab" type="button" data-action="tab" data-tab="${id}" aria-current="${current}" aria-pressed="${pressed}">${icon(glyph)}<span>${label}</span></button>`;
    })
    .join("");
  return `<div class="app">
    <header class="header">
      <img class="brand-avatar" src="${esc(avatar)}" alt="" width="44" height="44">
      <div>
        <h1 class="brand-name">Avari <span>FC</span></h1>
        <p class="brand-sub">канал @AvariFC</p>
      </div>
    </header>
    <main class="main">${content}</main>
    <nav class="tabbar" aria-label="Разделы">${tabs}</nav>
  </div>`;
}

export function renderApp(state, manifest, now) {
  let content = "";
  if (state.status === "loading") content = '<p class="empty">Загружаем расписание…</p>';
  else if (state.status === "error") {
    content = `<div class="empty"><p>${esc(state.error)}</p><button class="btn btn-primary" type="button" data-action="retry">Повторить</button></div>`;
  } else if (state.view?.type === "team") content = renderTeam(state, manifest, now);
  else if (state.view?.type === "day") content = renderDay(state, manifest, now);
  else if (state.view?.type === "match") content = renderMatch(state, manifest, now);
  else if (state.tab === "calendar") content = renderCalendar(state, manifest, now);
  else if (state.tab === "teams") content = renderTeams(state, manifest, now);
  else if (state.tab === "more") content = renderMore();
  else content = renderHome(state, manifest, now);
  return shell(state, content);
}

export function updateCountdowns(now = Date.now()) {
  document.querySelectorAll("[data-countdown]").forEach((node) => {
    const kick = Number(node.getAttribute("data-countdown"));
    if (!Number.isFinite(kick)) return;
    const diff = kick - now;
    node.textContent = diff > 0 ? `через ${countdownLabel(diff)}` : "уже начался";
  });
}

export function shiftMonth(year, month, delta) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}
