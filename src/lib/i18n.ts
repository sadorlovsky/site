/**
 * Shared i18n utilities for client-side language detection and switching
 */

export type Lang = "en" | "ru";

/**
 * Detects user's preferred language from browser settings
 */
export function detectBrowserLang(): Lang {
  const browserLangs = navigator.languages || [navigator.language];
  const isRussian = browserLangs.some((l) => l.toLowerCase().startsWith("ru"));
  return isRussian ? "ru" : "en";
}

/**
 * Gets the current language from localStorage or detects from browser
 */
export function getLang(storageKey: string): Lang {
  const saved = localStorage.getItem(storageKey);
  if (saved === "en" || saved === "ru") {
    return saved;
  }

  const detected = detectBrowserLang();
  localStorage.setItem(storageKey, detected);
  return detected;
}

/**
 * Sets the language and updates localStorage
 */
export function setLang(storageKey: string, lang: Lang): void {
  localStorage.setItem(storageKey, lang);

  if (lang === "ru") {
    document.documentElement.classList.add("lang-ru");
  } else {
    document.documentElement.classList.remove("lang-ru");
  }
}

/**
 * Initializes language on page load (call early to avoid flash)
 */
export function initLang(storageKey: string): Lang {
  const lang = getLang(storageKey);
  setLang(storageKey, lang);
  return lang;
}

/**
 * Applies translations to elements with data-en/data-ru attributes
 */
export function applyTranslations(lang: Lang): void {
  // Translate text content
  document.querySelectorAll<HTMLElement>("[data-en][data-ru]").forEach((el) => {
    const text = el.getAttribute(`data-${lang}`);
    if (text) el.textContent = text;
  });

  // Translate title attributes (for icons)
  document
    .querySelectorAll<HTMLElement>("[data-title-en][data-title-ru]")
    .forEach((el) => {
      const title = el.getAttribute(`data-title-${lang}`);
      if (title) el.setAttribute("title", title);
    });

  // Translate aria-label attributes
  document
    .querySelectorAll<HTMLElement>("[data-aria-label-en][data-aria-label-ru]")
    .forEach((el) => {
      const label = el.getAttribute(`data-aria-label-${lang}`);
      if (label) el.setAttribute("aria-label", label);
    });
}
