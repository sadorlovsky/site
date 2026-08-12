import { describe, expect, it } from "vitest";
import { parsePrice, priceInUsdCents, type RubRates } from "./price";

describe("parsePrice", () => {
  it("reads every currency the wishlist writes prices in", () => {
    expect(parsePrice("$64")).toEqual({ amount: 6400, currency: "USD" });
    expect(parsePrice("AU$140")).toEqual({ amount: 14000, currency: "AUD" });
    expect(parsePrice("£25")).toEqual({ amount: 2500, currency: "GBP" });
    expect(parsePrice("€300")).toEqual({ amount: 30000, currency: "EUR" });
    expect(parsePrice("₹1200")).toEqual({ amount: 120000, currency: "INR" });
    expect(parsePrice("₽768")).toEqual({ amount: 76800, currency: "RUB" });
    expect(parsePrice("₸25,940")).toEqual({ amount: 2594000, currency: "KZT" });
  });

  it("keeps the fractions that decide which option is cheapest", () => {
    expect(parsePrice("€6.20")).toEqual({ amount: 620, currency: "EUR" });
    expect(parsePrice("€6.50")).toEqual({ amount: 650, currency: "EUR" });
  });

  it("groups thousands with a space as readily as with a comma", () => {
    // How a Kazakh shop prints it, and how it arrives when pasted. The second
    // is escaped because a paste carries a non-breaking space, which reads
    // exactly like an ordinary one in every editor.
    expect(parsePrice("₸3 900")).toEqual({
      amount: 390000,
      currency: "KZT",
    });
    expect(parsePrice("₸3\u00a0900")).toEqual({
      amount: 390000,
      currency: "KZT",
    });
    expect(parsePrice("₸25 940.50")).toEqual({
      amount: 2594050,
      currency: "KZT",
    });
  });

  it("prefers AU$ to the $ it starts with", () => {
    expect(parsePrice("AU$140")?.currency).toBe("AUD");
  });

  it("returns null for a price it cannot read", () => {
    expect(parsePrice("free")).toBeNull();
    expect(parsePrice("64")).toBeNull();
    expect(parsePrice("$")).toBeNull();
  });

  it("reads no part of a price it cannot read whole", () => {
    // The alternative is worse than nothing: an option read as 3 rather than
    // rejected wins the cheapest-option comparison outright.
    expect(parsePrice("$64 or so")).toBeNull();
    expect(parsePrice("₸3 900 tenge")).toBeNull();
    expect(parsePrice("$12.34.56")).toBeNull();
  });
});

describe("priceInUsdCents", () => {
  const rates: RubRates = {
    RUB: 1,
    USD: 82,
    EUR: 98,
    GBP: 112,
    AUD: 56,
    INR: 1,
    KZT: 0.15,
  };

  it("takes a USD price as it stands", () => {
    expect(priceInUsdCents("$64", rates)).toBe(6400);
  });

  it("takes a USD price even with no rouble rate on file", () => {
    // It needs no conversion, so the missing row is none of its business
    expect(priceInUsdCents("$64", {})).toBe(6400);
  });

  it("converts through roubles", () => {
    // 25 GBP = 2800 RUB = 34.14 USD
    expect(priceInUsdCents("£25", rates)).toBe(3415);
    // 768 RUB = 9.36 USD
    expect(priceInUsdCents("₽768", rates)).toBe(937);
  });

  it("converts a currency worth a fraction of a rouble", () => {
    // 25,940 KZT = 3891 RUB = 47.45 USD, which no whole-rouble rate could say
    expect(priceInUsdCents("₸25,940", rates)).toBe(4745);
  });

  it("ranks a tenge price against the others rather than dropping out", () => {
    const amazon = priceInUsdCents("$60.88", rates);
    const meloman = priceInUsdCents("₸25,940", rates);
    expect(meloman).not.toBeNull();
    expect(meloman!).toBeLessThan(amazon!);
  });

  it("says a price costs 0 cents rather than that it has none", () => {
    // A fractional rate puts real prices within rounding distance of zero, and
    // 0 has to stay 0: null would drop the option out of the comparison, which
    // is not the same answer.
    expect(priceInUsdCents("₸2", rates)).toBe(0);
  });

  it("has nothing to say without a rate on file", () => {
    expect(priceInUsdCents("₸25,940", { USD: 82 })).toBeNull();
    expect(priceInUsdCents("£25", {})).toBeNull();
    expect(priceInUsdCents("free", rates)).toBeNull();
  });
});
