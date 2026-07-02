const RESET_VERSION = "2026-07-02-blank-slate-1";
const RESET_KEY = "dukou:blankSlateResetVersion";
const MESSAGE_DB_NAME = "dukou-message-archive";

function clearDukouLocalStorage() {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (window.localStorage.getItem(RESET_KEY) === RESET_VERSION) return;

  const keys = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith("dukou:")) keys.push(key);
  }
  keys.forEach((key) => window.localStorage.removeItem(key));
  window.localStorage.setItem(RESET_KEY, RESET_VERSION);
}

function clearMessageArchiveDb() {
  if (typeof indexedDB === "undefined") return;
  try {
    indexedDB.deleteDatabase(MESSAGE_DB_NAME);
  } catch {}
}

export function runBlankSlateReset() {
  const alreadyReset =
    typeof window !== "undefined" &&
    window.localStorage?.getItem(RESET_KEY) === RESET_VERSION;

  if (alreadyReset) return;
  clearDukouLocalStorage();
  clearMessageArchiveDb();
}
