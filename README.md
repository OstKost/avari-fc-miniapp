# Avari FC

Мини-приложение Telegram для канала [@AvariFC](https://t.me/AvariFC) и бота [@AvariFCBot](https://t.me/AvariFCBot). Календарь матчей восьми команд: «Арсенал», «Барселона», «Реал Мадрид», «Галатасарай», «Ростов», «ПСЖ», сборные Испании и Франции. Время везде московское (МСК, UTC+3).

Сервера и токена бота нет: это статические файлы. Их можно открыть в обычном браузере и отдать с любого HTTPS-хостинга.

## Локальный запуск

Нужен Node.js 20 или новее.

```bash
npm install
npm run dev
```

Откройте [http://127.0.0.1:43123/avari-fc-miniapp/](http://127.0.0.1:43123/avari-fc-miniapp/). Ширина 360px — основной размер, на широком экране колонка остаётся узкой.

Проверки:

```bash
npm test
npm run build
npm run preview
```

`npm run build` собирает каталог `dist/`. Его и нужно публиковать.

## Деплой

Сайт публикуется на GitHub Pages по адресу [https://ostkost.github.io/avari-fc-miniapp/](https://ostkost.github.io/avari-fc-miniapp/). В `vite.config.js` задан `base: "/avari-fc-miniapp/"`. Гербы, аватар, `schedule.json` и собранные шрифты запрашиваются от этого префикса (`import.meta.env.BASE_URL` и `%BASE_URL%`). Файл `.ics` собирается в браузере и скачивается локально, отдельного адреса на хосте у него нет.

Пуш в ветку `main` репозитория [OstKost/avari-fc-miniapp](https://github.com/OstKost/avari-fc-miniapp) запускает `.github/workflows/pages.yml`: `npm ci`, `npm run build`, публикация каталога `dist`. Источник Pages — GitHub Actions. Токен бота для деплоя не нужен.

Адрес должен быть `https://`. Telegram не откроет мини-приложение по `http://`, кроме особых случаев в клиенте разработчика.

## Обновление расписания

Матчи лежат в `public/data/schedule.json`. Поля: `id`, `date` (`YYYY-MM-DD`), `time_msk` (`HH:MM` или пустая строка), `team`, `opponent`, `tournament`, `venue` (`дома` или `в гостях`), `status`, необязательный `result`, `source_url`.

Чтобы обновить файл, выгрузите вкладку «Расписание» из таблицы в CSV (Файл → Скачать → CSV). Нужны столбцы: Дата (`дд.мм.гггг`), Время МСК, Команда, Соперник, Турнир, Дома/в гостях, Статус, Источник, Проверено, Live, ID. Столбцы «Проверено» и «Live» скрипт не использует. Скрипт также понимает JSON-выгрузку той же вкладки и пропускает первую строку, если она не JSON (так устроен префикс некоторых выгрузок Google).

```bash
npm run schedule -- путь/к/Расписание.csv
```

Второй аргумент — куда записать JSON. Без него файл пишется в `public/data/schedule.json`. После этого снова выполните `npm run build` и задеплойте `dist/`.

Счёт в `result` скрипт достаёт из статуса вида `завершён: … (FT)`. Заметку после ссылки в столбце «Источник» в `source_url` не кладёт.

## Как привязать к боту

Токен в репозиторий класть не нужно и в коде его нет.

1. Задеплойте `dist/` и скопируйте HTTPS-адрес.
2. Откройте [@BotFather](https://t.me/BotFather).
3. `/mybots` → `@AvariFCBot` → **Bot Settings** → **Configure Mini App** (или **Menu Button**) и вставьте URL.
4. Либо команда `/newapp`: выберите бота и укажите тот же URL, название и короткое имя мини-приложения.

Кнопка меню рядом с полем ввода открывает приложение. То же самое можно сделать методом Bot API `setChatMenuButton`, подставив токен только у себя в терминале и не сохраняя команду в гит:

```bash
curl -sS -X POST "https://api.telegram.org/bot<ТОКЕН>/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d '{"menu_button":{"type":"web_app","text":"Календарь","web_app":{"url":"https://ВАШ-ДОМЕН/"}}}'
```

Внутри Telegram приложение вызывает `Telegram.WebApp.ready()` и `expand()`, берёт цвета из `themeParams`, для вложенных экранов показывает BackButton, а главную кнопку (канал, календарь .ics) — через MainButton. Вне Telegram те же экраны работают сами, избранное и фильтр команд пишутся в `localStorage`. В Telegram они дополнительно пишутся в CloudStorage.

Кнопка «Напомнить» намеренно отсутствует: без сервера пуш не отправить. Матч можно скачать файлом `.ics` (один матч или все предстоящие выбранных команд) и поделиться ссылкой на канал через `t.me/share/url`.

## Гербы

Знаки лежат в `public/crests/` и не подгружаются с чужих сайтов. Это официальные гербы клубов и сборных с английской Википедии и Wikimedia Commons — для узнаваемости в болельщицком приложении. Товарные знаки остаются у клубов и федераций; лицензия конкретного файла написана на его странице.

Сопоставления, которых нет в коротком имени из таблицы: «Депортиво» — Deportivo de La Coruña, «АЕК» — AEK Athens, «Сабах» — Sabah FK (Азербайджан), «Турция» — нагрудный знак сборных Турции. Если файла нет, на месте герба остаётся круг цвета команды с инициалами.

| Кто | Файл | Источник |
| --- | --- | --- |
| Арсенал | `public/crests/arsenal.svg` | [файл](https://en.wikipedia.org/wiki/File:Arsenal_FC.svg) · [статья](https://en.wikipedia.org/wiki/Arsenal_F.C.) |
| Барселона | `public/crests/barcelona.svg` | [файл](https://en.wikipedia.org/wiki/File:FC_Barcelona_%28crest%29.svg) · [статья](https://en.wikipedia.org/wiki/FC_Barcelona) |
| Реал Мадрид | `public/crests/real.svg` | [файл](https://en.wikipedia.org/wiki/File:Real_Madrid_CF.svg) · [статья](https://en.wikipedia.org/wiki/Real_Madrid_CF) |
| Галатасарай | `public/crests/galatasaray.svg` | [файл](https://commons.wikimedia.org/wiki/File:Galatasaray_S.K._Logo_2026_5-stars.svg) · [статья](https://en.wikipedia.org/wiki/Galatasaray_S.K._(football)) |
| Ростов | `public/crests/rostov.png` | [файл](https://en.wikipedia.org/wiki/File:FC_Rostov_logo.svg) · [статья](https://en.wikipedia.org/wiki/FC_Rostov) |
| ПСЖ | `public/crests/psg.svg` | [файл](https://en.wikipedia.org/wiki/File:Paris_Saint-Germain_F.C..svg) · [статья](https://en.wikipedia.org/wiki/Paris_Saint-Germain_FC) |
| сборная Испании | `public/crests/spain.svg` | [файл](https://en.wikipedia.org/wiki/File:Spain_national_football_team_crest.svg) · [статья](https://en.wikipedia.org/wiki/Spain_national_football_team) |
| сборная Франции | `public/crests/france.svg` | [файл](https://en.wikipedia.org/wiki/File:France_national_football_team_seal.svg) · [статья](https://en.wikipedia.org/wiki/France_national_football_team) |
| Италия | `public/crests/italy.svg` | [файл](https://commons.wikimedia.org/wiki/File:Logo_Italy_National_Football_Team_-_2023.svg) · [статья](https://en.wikipedia.org/wiki/Italy_national_football_team) |
| Англия | `public/crests/england.svg` | [файл](https://en.wikipedia.org/wiki/File:England_national_football_team_crest.svg) · [статья](https://en.wikipedia.org/wiki/England_national_football_team) |
| Чехия | `public/crests/czechia.svg` | [файл](https://en.wikipedia.org/wiki/File:Czech_Republic_national_football_team_logo.svg) · [статья](https://en.wikipedia.org/wiki/Czech_Republic_national_football_team) |
| Турция | `public/crests/turkey.png` | [файл](https://commons.wikimedia.org/wiki/File:T%C3%BCrk_mill%C3%AE_tak%C4%B1mlar_g%C3%B6%C4%9F%C3%BCs_armas%C4%B1.png) · [статья](https://en.wikipedia.org/wiki/Turkey_national_football_team) |
| Крылья Советов | `public/crests/krylia.svg` | [файл](https://en.wikipedia.org/wiki/File:PFC_Krylia_Sovetov_Samara.svg) · [статья](https://en.wikipedia.org/wiki/PFC_Krylia_Sovetov_Samara) |
| Самсунспор | `public/crests/samsunspor.svg` | [файл](https://en.wikipedia.org/wiki/File:Samsunspor_crest.svg) · [статья](https://en.wikipedia.org/wiki/Samsunspor) |
| Ницца | `public/crests/nice.svg` | [файл](https://en.wikipedia.org/wiki/File:OGC_Nice_logo.svg) · [статья](https://en.wikipedia.org/wiki/OGC_Nice) |
| Ньюкасл | `public/crests/newcastle.svg` | [файл](https://en.wikipedia.org/wiki/File:Newcastle_United_FC_2026_crest.svg) · [статья](https://en.wikipedia.org/wiki/Newcastle_United_F.C.) |
| Сельта | `public/crests/celta.svg` | [файл](https://en.wikipedia.org/wiki/File:RC_Celta_de_Vigo_logo.svg) · [статья](https://en.wikipedia.org/wiki/RC_Celta_de_Vigo) |
| Вильярреал | `public/crests/villarreal.svg` | [файл](https://en.wikipedia.org/wiki/File:Villarreal_CF_logo-en.svg) · [статья](https://en.wikipedia.org/wiki/Villarreal_CF) |
| Астон Вилла | `public/crests/aston-villa.svg` | [файл](https://en.wikipedia.org/wiki/File:Aston_Villa_FC_new_crest.svg) · [статья](https://en.wikipedia.org/wiki/Aston_Villa_F.C.) |
| Боруссия Дортмунд | `public/crests/dortmund.svg` | [файл](https://commons.wikimedia.org/wiki/File:Borussia_Dortmund_logo.svg) · [статья](https://en.wikipedia.org/wiki/Borussia_Dortmund) |
| ПСВ | `public/crests/psv.svg` | [файл](https://en.wikipedia.org/wiki/File:PSV_Eindhoven.svg) · [статья](https://en.wikipedia.org/wiki/PSV_Eindhoven) |
| Локомотив | `public/crests/lokomotiv.svg` | [файл](https://en.wikipedia.org/wiki/File:FC_Lokomotiv_Moscow_logo.svg) · [статья](https://en.wikipedia.org/wiki/FC_Lokomotiv_Moscow) |
| Сабах | `public/crests/sabah.svg` | [файл](https://en.wikipedia.org/wiki/File:Sabah_FK_%28Azerbaijan%29_logo.svg) · [статья](https://en.wikipedia.org/wiki/Sabah_FK_(Azerbaijan)) |
| Рома | `public/crests/roma.svg` | [файл](https://en.wikipedia.org/wiki/File:AS_Roma_logo_%282017%29.svg) · [статья](https://en.wikipedia.org/wiki/AS_Roma) |
| Лорьян | `public/crests/lorient.svg` | [файл](https://en.wikipedia.org/wiki/File:FC_Lorient_logo.svg) · [статья](https://en.wikipedia.org/wiki/FC_Lorient) |
| Алавес | `public/crests/alaves.svg` | [файл](https://en.wikipedia.org/wiki/File:Deportivo_Alaves_logo_%282020%29.svg) · [статья](https://en.wikipedia.org/wiki/Deportivo_Alav%C3%A9s) |
| Краснодар | `public/crests/krasnodar.svg` | [файл](https://en.wikipedia.org/wiki/File:FC_Krasnodar_logo.svg) · [статья](https://en.wikipedia.org/wiki/FC_Krasnodar) |
| Депортиво | `public/crests/deportivo.svg` | [файл](https://en.wikipedia.org/wiki/File:RC_Deportivo_A_Coru%C3%B1a_logo_2026.svg) · [статья](https://en.wikipedia.org/wiki/Deportivo_de_A_Coru%C3%B1a) |
| Манчестер Сити | `public/crests/man-city.svg` | [файл](https://en.wikipedia.org/wiki/File:Manchester_City_FC_badge.svg) · [статья](https://en.wikipedia.org/wiki/Manchester_City_F.C.) |
| Бешикташ | `public/crests/besiktas.svg` | [файл](https://commons.wikimedia.org/wiki/File:BesiktasJK-Logo.svg) · [статья](https://en.wikipedia.org/wiki/Be%C5%9Fikta%C5%9F_J.K.) |
| Реал Сосьедад | `public/crests/sociedad.svg` | [файл](https://en.wikipedia.org/wiki/File:Real_Sociedad_logo.svg) · [статья](https://en.wikipedia.org/wiki/Real_Sociedad) |
| Брентфорд | `public/crests/brentford.svg` | [файл](https://en.wikipedia.org/wiki/File:Brentford_FC_crest.svg) · [статья](https://en.wikipedia.org/wiki/Brentford_F.C.) |
| Атлетико | `public/crests/atletico.svg` | [файл](https://en.wikipedia.org/wiki/File:Atletico_Madrid_Logo_2024.svg) · [статья](https://en.wikipedia.org/wiki/Atl%C3%A9tico_Madrid) |
| Ризеспор | `public/crests/rizespor.svg` | [файл](https://en.wikipedia.org/wiki/File:%C3%87aykur_Rizespor_logo.svg) · [статья](https://en.wikipedia.org/wiki/%C3%87aykur_Rizespor) |
| Тулуза | `public/crests/toulouse.svg` | [файл](https://en.wikipedia.org/wiki/File:Toulouse_FC_2018_logo.svg) · [статья](https://en.wikipedia.org/wiki/Toulouse_FC) |
| Факел | `public/crests/fakel.png` | [файл](https://en.wikipedia.org/wiki/File:FC_Fakel_Voronezh_logo.png) · [статья](https://en.wikipedia.org/wiki/FC_Fakel_Voronezh) |
| Тоттенхэм | `public/crests/tottenham.svg` | [файл](https://en.wikipedia.org/wiki/File:Tottenham_Hotspur.svg) · [статья](https://en.wikipedia.org/wiki/Tottenham_Hotspur_F.C.) |
| Атлетик | `public/crests/athletic.svg` | [файл](https://en.wikipedia.org/wiki/File:Club_Athletic_Bilbao_logo.svg) · [статья](https://en.wikipedia.org/wiki/Athletic_Bilbao) |
| АЕК | `public/crests/aek.svg` | [файл](https://en.wikipedia.org/wiki/File:AEK_Athens_FC_logo.svg) · [статья](https://en.wikipedia.org/wiki/AEK_Athens_F.C.) |

Аватар в шапке — фото канала.
