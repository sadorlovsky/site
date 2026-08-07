import {
  db,
  WishlistItem,
  ItemOption,
  Reservation,
  ExchangeRate,
} from "astro:db";
import { CDN_DOMAIN, CDN_DEV_DOMAIN } from "astro:env/server";

// CDN domain helper - uses production domain in prod, dev domain otherwise
const cdnDomain = import.meta.env.PROD
  ? CDN_DOMAIN
  : (CDN_DEV_DOMAIN ?? CDN_DOMAIN ?? "");

export function getCdnImageUrl(filename: string): string {
  return `https://${cdnDomain}/${filename}`;
}

/**
 * Length ceiling for the message a reserver may leave. Enforced by the action
 * and mirrored onto the textarea's `maxlength`; the client reads it back off
 * the element rather than importing this module, which is server-only.
 */
export const RESERVATION_MESSAGE_MAX_LENGTH = 200;

// Types
export type Currency = "USD" | "EUR" | "GBP" | "AUD" | "INR" | "RUB";

export type ParsedPrice = {
  amount: number; // In cents
  currency: Currency;
};

/**
 * One way to buy an item. The item's own price/url is one of these (with a null
 * id and no label); ItemOption rows are the rest.
 */
export type WishlistOption = {
  /** null for the item's own price/url, which owns no ItemOption row. */
  id: number | null;
  label: string | null;
  labelRu: string | null;
  price: string;
  priceUsd: number | null;
  priceRub: number | null;
  url: string | null;
};

export type WishlistItemWithReservation = {
  id: number;
  title: string;
  /**
   * The cheapest option's price, not necessarily the item's own — an item with
   * alternatives is worth what the cheapest way to get it costs, and the card
   * labels it "from". With no alternatives these are the item's own row, as
   * before.
   */
  price: string;
  priceUsd: number | null;
  priceRub: number | null;
  /**
   * Every way to buy this, the item's own price/url first — always at least
   * that one. A card renders the list the same way whether it holds one shop
   * or five; "has alternatives" is `options.length > 1`.
   */
  options: WishlistOption[];
  titleRu: string | null;
  imageUrl: string;
  imageUrlDark: string | null;
  description: string | null;
  descriptionRu: string | null;
  url: string | null;
  category: string;
  priority: string | null;
  received: boolean;
  createdAt: Date;
  weight: number;
  isReserved: boolean;
  /**
   * Deliberately no `reservedBy`. A visitor id is the credential that lets its
   * holder cancel a reservation or write on it, and this type is rendered into
   * a page every visitor can read — the card only needs to know that the item
   * is taken. Whose it is arrives per-visitor from
   * /api/wishlist/reservations.
   */
};

export type Category = {
  id: string;
  label: string;
  labelRu: string;
  href: string;
};

// Categories configuration
export const categories: Category[] = [
  { id: "all", label: "All", labelRu: "Все", href: "/wishlist" },
  {
    id: "clothing",
    label: "Clothing",
    labelRu: "Одежда",
    href: "/wishlist/clothing",
  },
  { id: "home", label: "Home", labelRu: "Дом", href: "/wishlist/home" },
  {
    id: "sweets",
    label: "Sweets",
    labelRu: "Сладости",
    href: "/wishlist/sweets",
  },
  { id: "vinyl", label: "Vinyl", labelRu: "Винил", href: "/wishlist/vinyl" },
  {
    id: "blu-ray",
    label: "Blu-ray",
    labelRu: "Blu-ray",
    href: "/wishlist/blu-ray",
  },
  { id: "books", label: "Books", labelRu: "Книги", href: "/wishlist/books" },
  { id: "merch", label: "Merch", labelRu: "Мерч", href: "/wishlist/merch" },
  { id: "other", label: "Other", labelRu: "Другое", href: "/wishlist/other" },
];

// Valid category IDs (excluding "all")
export const validCategoryIds = categories
  .map((c) => c.id)
  .filter((id) => id !== "all");

// Check if a category is valid
export function isValidCategory(
  category: string | undefined,
): category is string {
  return typeof category === "string" && validCategoryIds.includes(category);
}

// Priority order for sorting
const priorityOrder: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

// Currency prefixes mapping
const currencyPrefixes: { prefix: string; currency: Currency }[] = [
  { prefix: "AU$", currency: "AUD" },
  { prefix: "$", currency: "USD" },
  { prefix: "£", currency: "GBP" },
  { prefix: "€", currency: "EUR" },
  { prefix: "₹", currency: "INR" },
  { prefix: "₽", currency: "RUB" },
];

// Parse price string like "$64", "£25", "€300", "AU$140", "₽768"
export function parsePrice(price: string): ParsedPrice | null {
  const trimmed = price.trim();

  for (const { prefix, currency } of currencyPrefixes) {
    if (trimmed.startsWith(prefix)) {
      // parseFloat, not parseInt: "€6.20" and "€6.50" both read as 6 otherwise,
      // and picking the cheapest of an item's options has to be able to tell
      // them apart.
      const amount = parseFloat(trimmed.slice(prefix.length).replace(/,/g, ""));
      return isNaN(amount)
        ? null
        : { amount: Math.round(amount * 100), currency };
    }
  }

  return null;
}

/** How a shop link reads on a card: bare host and path, no scheme, no trailing slash. */
export function formatUrlLabel(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

/**
 * The shop's name alone, for an option the owner left unlabelled. A row in a
 * list of options is narrow and sits beside labels like "Penguin hardcover";
 * a product path would only ellipsize away there, so it names the shop instead.
 */
export function formatHostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return formatUrlLabel(url);
  }
}

// Fetch wishlist items with optional category filter
export async function getWishlistItems(
  category?: string,
): Promise<WishlistItemWithReservation[]> {
  // Fetch all data from database in parallel
  const [wishlistItemsRaw, optionsRaw, reservations, exchangeRatesRaw] =
    await Promise.all([
      db.select().from(WishlistItem),
      db.select().from(ItemOption),
      db.select().from(Reservation),
      db.select().from(ExchangeRate),
    ]);

  // Build exchange rate lookup from DB: currency -> rate to RUB
  const toRubRates: Partial<Record<Currency, number>> = {
    // Not a row anyone would store, and every rouble price needs it to take
    // part in the comparison that picks an item's cheapest option.
    RUB: 1,
  };
  for (const rate of exchangeRatesRaw) {
    if (rate.toCurrency === "RUB") {
      toRubRates[rate.fromCurrency as Currency] = rate.rate;
    }
  }

  const usdToRub = toRubRates.USD;

  // Extra ways to buy, grouped by item and in display order
  const extraOptions = new Map<number, typeof optionsRaw>();
  for (const option of [...optionsRaw].sort(
    (a, b) => a.position - b.position || a.id - b.id,
  )) {
    const forItem = extraOptions.get(option.itemId);
    if (forItem) forItem.push(option);
    else extraOptions.set(option.itemId, [option]);
  }

  // Compute priceUsd from original price
  function computePriceUsd(price: string): number | null {
    const parsed = parsePrice(price);
    if (!parsed || !usdToRub) return null;

    if (parsed.currency === "USD") {
      return parsed.amount;
    }

    // Convert to USD: amount_in_currency * (rate_to_rub / usd_to_rub_rate)
    const rateToRub = toRubRates[parsed.currency];
    if (!rateToRub) return null;

    return Math.round((parsed.amount * rateToRub) / usdToRub);
  }

  // Price a single way of buying, in both the currencies the card can show
  function priceOf(
    price: string,
  ): Pick<WishlistOption, "priceUsd" | "priceRub"> {
    const priceUsd = computePriceUsd(price);
    return {
      priceUsd,
      priceRub: priceUsd && usdToRub ? priceUsd * usdToRub : null,
    };
  }

  // Combine items with their reservation status and computed prices
  let items: WishlistItemWithReservation[] = wishlistItemsRaw.map((item) => {
    const reservation = reservations.find((r) => r.itemId === item.id);

    // The item's own price/url, as an option among the others
    const ownOption: WishlistOption = {
      id: null,
      label: null,
      labelRu: null,
      price: item.price,
      url: item.url,
      ...priceOf(item.price),
    };

    const options: WishlistOption[] = [
      ownOption,
      ...(extraOptions.get(item.id) ?? []).map((option) => ({
        id: option.id,
        label: option.label,
        labelRu: option.labelRu,
        price: option.price,
        url: option.url,
        ...priceOf(option.price),
      })),
    ];

    // What the card puts in its footer: the cheapest option we can compare.
    // A price in a currency with no rate on file has no comparable value, so it
    // sits the comparison out; if that leaves nothing to compare (and always
    // when there are no alternatives at all), the item's own price stands.
    const comparable = options.filter((option) => option.priceUsd !== null);
    const displayed = comparable.length
      ? comparable.reduce((min, option) =>
          option.priceUsd! < min.priceUsd! ? option : min,
        )
      : ownOption;

    return {
      ...item,
      price: displayed.price,
      priceUsd: displayed.priceUsd,
      priceRub: displayed.priceRub,
      options,
      isReserved: !!reservation,
    };
  });

  // Filter by category if specified (supports comma-separated categories)
  if (category && category !== "all") {
    items = items.filter((item) => {
      const itemCategories = item.category.split(",").map((c) => c.trim());
      return itemCategories.includes(category);
    });
  }

  // Sort items: priority → weight (higher first) → createdAt (newest first) → received last
  items.sort((a, b) => {
    // Received items always go to the end
    if (a.received && !b.received) return 1;
    if (!a.received && b.received) return -1;

    // Sort by priority (high first, no priority last)
    const aPriority = a.priority ? (priorityOrder[a.priority] ?? 3) : 3;
    const bPriority = b.priority ? (priorityOrder[b.priority] ?? 3) : 3;
    if (aPriority !== bPriority) return aPriority - bPriority;

    // Within same priority, sort by weight (higher weight first)
    if (a.weight !== b.weight) return b.weight - a.weight;

    // Within same weight, sort by createdAt (newest first)
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return items;
}
