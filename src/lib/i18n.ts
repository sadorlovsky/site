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

/**
 * Russian plural for a count: 1 город, 2 города, 5 городов.
 *
 * Here rather than beside its first caller, which was the travel map's cluster
 * label, because it is a fact about the language and not about maps — the
 * wishlist's item count needs the identical three-way choice. Note the two
 * exceptions the naive `n % 10` version gets wrong and this one does not: the
 * teens (11 городов, not 11 город) and 111–114.
 */
export function plural(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
