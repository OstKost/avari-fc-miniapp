import { shareText } from "./ics.js";

const CHANNEL = "https://t.me/AvariFC";

export function telegramApp() {
  try {
    return window.Telegram?.WebApp ?? null;
  } catch {
    return null;
  }
}

export function inTelegram() {
  try {
    const tg = telegramApp();
    if (!tg) return false;
    if (tg.initData) return true;
    return Boolean(tg.platform && tg.platform !== "unknown");
  } catch {
    return false;
  }
}

function supports(version) {
  try {
    const tg = telegramApp();
    return typeof tg?.isVersionAtLeast === "function" && Boolean(tg.isVersionAtLeast(version));
  } catch {
    return false;
  }
}

function invoke(fn) {
  try {
    fn();
  } catch {
    /* older clients */
  }
}

const DARK = {
  "--bg": "#071512",
  "--surface": "#123028",
  "--surface-2": "#1a3b32",
  "--text": "#f4f1e8",
  "--muted": "#c5d5cb",
  "--faint": "#8ea89a",
  "--line": "rgba(228, 201, 138, 0.18)",
  "--gold": "#e4c98a",
  "--accent": "#3dbe7f",
  "--accent-ink": "#062117",
  "--link": "#8ddec0",
  "--danger": "#ff8d7a",
  "--shadow": "0 12px 30px rgba(0, 0, 0, 0.28)",
};

const LIGHT = {
  "--bg": "#f3f6f1",
  "--surface": "#ffffff",
  "--surface-2": "#e7f0ea",
  "--text": "#12241c",
  "--muted": "#3e5c4e",
  "--faint": "#6d8578",
  "--line": "rgba(16, 60, 44, 0.12)",
  "--gold": "#8a6424",
  "--accent": "#0f8a52",
  "--accent-ink": "#ffffff",
  "--link": "#0b6b40",
  "--danger": "#a33b32",
  "--shadow": "0 10px 24px rgba(18, 36, 28, 0.08)",
};

function paint(vars) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
  const theme = document.querySelector('meta[name="theme-color"]');
  if (theme) theme.setAttribute("content", vars["--bg"]);
}

export function applyBrandTheme() {
  try {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
    paint(DARK);
  } catch {
    /* ignore */
  }
}

export function applyTelegramTheme() {
  try {
    const tg = telegramApp();
    if (!tg) return;
    const scheme = tg.colorScheme === "light" ? "light" : "dark";
    const base = scheme === "light" ? LIGHT : DARK;
    const params = tg.themeParams ?? {};
    const next = { ...base };
    if (params.bg_color) next["--bg"] = params.bg_color;
    if (params.secondary_bg_color) next["--surface"] = params.secondary_bg_color;
    if (params.section_bg_color) next["--surface-2"] = params.section_bg_color;
    if (params.text_color) next["--text"] = params.text_color;
    if (params.hint_color) next["--muted"] = params.hint_color;
    if (params.subtitle_text_color) next["--faint"] = params.subtitle_text_color;
    if (params.link_color) next["--link"] = params.link_color;
    if (params.button_color) next["--accent"] = params.button_color;
    if (params.button_text_color) next["--accent-ink"] = params.button_text_color;
    if (params.destructive_text_color) next["--danger"] = params.destructive_text_color;
    document.documentElement.dataset.theme = scheme;
    document.documentElement.style.colorScheme = scheme;
    paint(next);
    if (!supports("6.1")) return;
    invoke(() => tg.setHeaderColor(params.header_bg_color || params.bg_color || next["--bg"]));
    invoke(() => tg.setBackgroundColor(params.bg_color || next["--bg"]));
  } catch {
    applyBrandTheme();
  }
}

export function initTelegram(handlers) {
  const tg = telegramApp();
  if (tg && supports("6.0")) {
    invoke(() => tg.ready());
    invoke(() => tg.expand());
  }
  if (tg && supports("7.7")) invoke(() => tg.disableVerticalSwipes());
  if (!tg || !inTelegram()) {
    applyBrandTheme();
    return;
  }
  applyTelegramTheme();
  if (!supports("6.1")) return;
  invoke(() => tg.onEvent("themeChanged", applyTelegramTheme));
  invoke(() => tg.BackButton?.onClick(() => handlers.onBack()));
  invoke(() => tg.MainButton?.onClick(() => handlers.onMain()));
}

export function syncChrome(spec, nested) {
  if (!inTelegram() || !supports("6.1")) return;
  const tg = telegramApp();
  if (!tg) return;
  invoke(() => {
    const back = tg.BackButton;
    const main = tg.MainButton;
    if (!back || !main) return;
    if (nested) back.show();
    else back.hide();
    if (!spec) {
      main.hide();
      return;
    }
    try {
      main.setParams({ text: spec.text, is_visible: true });
    } catch {
      main.setText(spec.text);
      main.show();
    }
  });
}

export function haptic(kind) {
  if (!inTelegram() || !supports("6.1")) return;
  invoke(() => {
    const feedback = telegramApp()?.HapticFeedback;
    if (!feedback) return;
    if (kind === "select") feedback.selectionChanged();
    else if (kind === "success") feedback.notificationOccurred("success");
    else feedback.impactOccurred(kind === "medium" ? "medium" : "light");
  });
}

function openExternalUrl(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function openTelegramLink(url) {
  const tg = telegramApp();
  if (inTelegram() && supports("6.1") && typeof tg?.openTelegramLink === "function") {
    try {
      tg.openTelegramLink(url);
      return;
    } catch {
      /* older clients */
    }
  }
  openExternalUrl(url);
}

export function openChannel() {
  openTelegramLink(CHANNEL);
}

export function openExternal(url) {
  const tg = telegramApp();
  if (inTelegram() && supports("6.1") && typeof tg?.openLink === "function") {
    try {
      tg.openLink(url);
      return;
    } catch {
      /* older clients */
    }
  }
  openExternalUrl(url);
}

export function shareMatch(match) {
  const url = `https://t.me/share/url?url=${encodeURIComponent(CHANNEL)}&text=${encodeURIComponent(shareText(match))}`;
  openTelegramLink(url);
}
