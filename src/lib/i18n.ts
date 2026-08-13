/**
 * The site's two languages, as a type.
 *
 * This file used to carry a small library beside it — detectBrowserLang,
 * getLang, setLang, initLang, applyTranslations — and nothing imported any of
 * them. LangInit.astro and LangSwitcher.astro each inline their own copy,
 * because both run before hydration inside a plain <script> and cannot import
 * a module the bundler has not put there yet.
 *
 * Two copies of a routine and one unused original is the arrangement where the
 * original quietly stops being true, and it had: the setLang here set a class
 * on <html> and left `lang` alone, while both live copies set the attribute
 * too. Anyone reaching for the shared helper — the obvious thing to do — would
 * have got a page that says it is in English while showing Russian, which is
 * the one part of this the screen reader is listening to.
 *
 * So the library is gone rather than fixed. The two inline copies are the
 * implementation, they are correct, and this is the type they agree on.
 */
export type Lang = "en" | "ru";
