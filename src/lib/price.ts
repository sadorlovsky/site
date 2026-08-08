/**
 * Prices as the wishlist writes them, and what one is worth against another.
 *
 * This lives apart from wishlist.ts because wishlist.ts opens the database at
 * module scope: the admin panel is React running in the browser and needs the
 * same parser the public cards use, and only a module with no imports can be
 * had by both. Everything here is a pure function of its arguments.
 */

export type Currency = "USD" | "EUR" | "GBP" | "AUD" | "INR" | "RUB" | "KZT";

export type ParsedPrice = {
  amount: number; // In cents
  currency: Currency;
};

// Currency prefixes mapping. AU$ comes before $, or it never matches.
const currencyPrefixes: { prefix: string; currency: Currency }[] = [
  { prefix: "AU$", currency: "AUD" },
  { prefix: "$", currency: "USD" },
  { prefix: "£", currency: "GBP" },
  { prefix: "€", currency: "EUR" },
  { prefix: "₹", currency: "INR" },
  { prefix: "₽", currency: "RUB" },
  { prefix: "₸", currency: "KZT" },
];

/**
 * What may sit between the digits of an amount: a comma or a space grouping
 * thousands. `\s` covers the non-breaking and thin spaces a paste out of a shop
 * carries, which matters because tenge prices run to four and five digits and
 * so arrive grouped one way or the other — "₸3,900" or "₸3 900".
 */
const groupingSeparators = /[\s,]/g;

/**
 * What has to be left once the grouping is out: an amount, optionally with a
 * fraction, and nothing else. A price that fails this reads as unreadable
 * rather than as whatever prefix of itself parseFloat could salvage — an option
 * with no readable price sits out the comparison that picks an item's cheapest
 * way to buy, while one read as 3 instead of 3900 wins it outright.
 */
const amountPattern = /^\d+(\.\d+)?$/;

// Parse price string like "$64", "£25", "€300", "AU$140", "₽768", "₸25,940"
export function parsePrice(price: string): ParsedPrice | null {
  const trimmed = price.trim();

  for (const { prefix, currency } of currencyPrefixes) {
    if (trimmed.startsWith(prefix)) {
      const digits = trimmed
        .slice(prefix.length)
        .replace(groupingSeparators, "");
      if (!amountPattern.test(digits)) return null;

      // parseFloat, not parseInt: "€6.20" and "€6.50" both read as 6 otherwise,
      // and picking the cheapest of an item's options has to be able to tell
      // them apart.
      return { amount: Math.round(parseFloat(digits) * 100), currency };
    }
  }

  return null;
}

/**
 * The rates as the ExchangeRate table holds them: roubles for one unit of the
 * currency. Some of them are fractions — a tenge is worth about 0.15 of a
 * rouble — which is why the column is real and not integer.
 */
export type RubRates = Partial<Record<Currency, number>>;

/**
 * What a price string is worth in US cents, or null if nothing on file can say
 * — an unreadable price, or a currency with no rate. Null is not zero: an
 * option priced this way sits out the comparison that picks an item's cheapest
 * way to buy rather than winning it.
 */
export function priceInUsdCents(
  price: string,
  toRubRates: RubRates,
): number | null {
  const parsed = parsePrice(price);
  if (!parsed) return null;

  // Dollars are already the answer. Asking for the USD→RUB rate first would
  // lose every dollar price whenever the table happens not to carry that row.
  if (parsed.currency === "USD") return parsed.amount;

  // Convert to USD: amount_in_currency * (rate_to_rub / usd_to_rub_rate). Both
  // rates are real numbers, so the rounding happens once, at the end, on a
  // count of cents — not on the rate that got us there.
  const usdToRub = toRubRates.USD;
  const rateToRub = toRubRates[parsed.currency];
  if (!usdToRub || !rateToRub) return null;

  return Math.round((parsed.amount * rateToRub) / usdToRub);
}
