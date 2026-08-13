import {
  db,
  WishlistItem,
  ItemOption,
  Reservation,
  ExchangeRate,
} from "@lib/db";
import { priceInUsdCents, type Currency, type RubRates } from "@lib/price";
import { comparePublic } from "@lib/wishlist-sort";
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
  const toRubRates: RubRates = {
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

  // Price a single way of buying, in both the currencies the card can show
  function priceOf(
    price: string,
  ): Pick<WishlistOption, "priceUsd" | "priceRub"> {
    const priceUsd = priceInUsdCents(price, toRubRates);
    return {
      priceUsd,
      // `!== null`, not truthiness: a price small enough to round to 0 cents is
      // still a price, and the comparison below admits it on `!== null` — so
      // treating it as absent here would let it win the item's "from" price and
      // then have no roubles to show for it. Rounded, because a fractional
      // USD→RUB rate would otherwise leave fractions of a kopeck in a field the
      // rest of the code counts in cents.
      priceRub:
        priceUsd !== null && usdToRub ? Math.round(priceUsd * usdToRub) : null,
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

  items.sort(comparePublic);

  return items;
}
