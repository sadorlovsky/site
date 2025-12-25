import { db, WishlistItem, Reservation, ExchangeRate } from "astro:db";

// Types
export type Currency = "USD" | "EUR" | "GBP" | "AUD";

export type ParsedPrice = {
  amount: number; // In cents
  currency: Currency;
};

export type WishlistItemWithReservation = {
  id: number;
  title: string;
  titleRu: string | null;
  price: string;
  priceUsd: number | null;
  priceRub: number | null;
  imageUrl: string;
  description: string | null;
  descriptionRu: string | null;
  url: string | null;
  category: string;
  priority: string | null;
  received: boolean;
  createdAt: Date;
  weight: number;
  isReserved: boolean;
  reservedBy: string | null;
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

// Parse price string like "$64", "£25", "€300", "AU$140"
export function parsePrice(price: string): ParsedPrice | null {
  const trimmed = price.trim();

  if (trimmed.startsWith("AU$")) {
    const amount = parseInt(trimmed.slice(3).replace(/,/g, ""), 10);
    return isNaN(amount) ? null : { amount: amount * 100, currency: "AUD" };
  }
  if (trimmed.startsWith("$")) {
    const amount = parseInt(trimmed.slice(1).replace(/,/g, ""), 10);
    return isNaN(amount) ? null : { amount: amount * 100, currency: "USD" };
  }
  if (trimmed.startsWith("£")) {
    const amount = parseInt(trimmed.slice(1).replace(/,/g, ""), 10);
    return isNaN(amount) ? null : { amount: amount * 100, currency: "GBP" };
  }
  if (trimmed.startsWith("€")) {
    const amount = parseInt(trimmed.slice(1).replace(/,/g, ""), 10);
    return isNaN(amount) ? null : { amount: amount * 100, currency: "EUR" };
  }

  return null;
}

// Fetch wishlist items with optional category filter
export async function getWishlistItems(
  category?: string,
): Promise<WishlistItemWithReservation[]> {
  // Fetch all data from database in parallel
  const [wishlistItemsRaw, reservations, exchangeRatesRaw] = await Promise.all([
    db.select().from(WishlistItem),
    db.select().from(Reservation),
    db.select().from(ExchangeRate),
  ]);

  // Build exchange rate lookup: currency -> rate to RUB
  const toRubRates: Record<Currency, number> = {
    USD: 100,
    EUR: 110,
    GBP: 130,
    AUD: 65,
  };

  // Override defaults with DB values
  for (const rate of exchangeRatesRaw) {
    if (rate.toCurrency === "RUB" && rate.fromCurrency in toRubRates) {
      toRubRates[rate.fromCurrency as Currency] = rate.rate;
    }
  }

  // Compute priceUsd from original price
  function computePriceUsd(price: string): number | null {
    const parsed = parsePrice(price);
    if (!parsed) return null;

    if (parsed.currency === "USD") {
      return parsed.amount;
    }

    // Convert to USD: amount_in_currency * (rate_to_rub / usd_to_rub_rate)
    const rateToRub = toRubRates[parsed.currency];
    const usdToRub = toRubRates.USD;
    return Math.round((parsed.amount * rateToRub) / usdToRub);
  }

  // Combine items with their reservation status and computed prices
  let items: WishlistItemWithReservation[] = wishlistItemsRaw.map((item) => {
    const reservation = reservations.find((r) => r.itemId === item.id);
    const priceUsd = computePriceUsd(item.price);
    const priceRub = priceUsd ? priceUsd * toRubRates.USD : null;

    return {
      ...item,
      priceUsd,
      priceRub,
      isReserved: !!reservation,
      reservedBy: reservation?.reservedBy ?? null,
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
