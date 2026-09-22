/**
 * What a cluster of cities calls itself in the map's tooltip.
 *
 * No numeral is drawn inside the bead — a digit knocked into a nine-pixel
 * circle at globe zoom says nothing — so this string is the only place the
 * count is actually stated, which is reason enough for it to live somewhere a
 * test can reach.
 */

import { plural } from "@lib/i18n";

/** What a cluster calls itself: the count and the word for what it holds. */
export function formatClusterLabel(count: number, lang: "en" | "ru"): string {
  return lang === "en"
    ? `${count} ${count === 1 ? "city" : "cities"}`
    : `${count} ${plural(count, "город", "города", "городов")}`;
}
