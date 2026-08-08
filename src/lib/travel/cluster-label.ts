/**
 * What a cluster of cities calls itself in the map's tooltip.
 *
 * No numeral is drawn inside the bead — a digit knocked into a nine-pixel
 * circle at globe zoom says nothing — so this string is the only place the
 * count is actually stated, which is reason enough for it to live somewhere a
 * test can reach.
 */

/** Russian plural for a count: 1 город, 2 города, 5 городов. */
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

/** What a cluster calls itself: the count and the word for what it holds. */
export function formatClusterLabel(count: number, lang: "en" | "ru"): string {
  return lang === "en"
    ? `${count} ${count === 1 ? "city" : "cities"}`
    : `${count} ${plural(count, "город", "города", "городов")}`;
}
