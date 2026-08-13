import type { Category } from "@lib/wishlist";

/**
 * An extra place this item can be bought. The item's own price/url is the first
 * option and owns no row here, so this list holds the alternatives only.
 */
export interface ItemOption {
  id: number;
  label: string | null;
  labelRu: string | null;
  price: string;
  url: string | null;
  position: number;
}

export interface WishlistItem {
  id: number;
  title: string;
  titleRu: string | null;
  price: string;
  imageUrl: string;
  description: string | null;
  descriptionRu: string | null;
  url: string | null;
  category: string;
  priority: string | null;
  received: boolean;
  createdAt: Date;
  weight: number;
  options: ItemOption[];
}

export interface Reservation {
  itemId: number;
  reservedBy: string;
  reservedAt: Date;
  /** The note the reserver left for the owner. This panel is where it lands. */
  message: string | null;
}

/** One option's row in the form. Order in the array is its display order. */
export interface ItemOptionFormData {
  label: string;
  labelRu: string;
  price: string;
  url: string;
}

export interface ItemFormData {
  title: string;
  titleRu?: string;
  price: string;
  imageUrl: string;
  description?: string;
  descriptionRu?: string;
  url?: string;
  category: string;
  priority?: string;
  /**
   * Deliberately no `weight`. It is a position in the list, not a property of
   * the item: dragging writes it, the create endpoint seeds it, and nothing
   * about this form has an opinion on where the item sits.
   */
  options: ItemOptionFormData[];
}

export type ExchangeRates = Record<string, number>;

export type { Category };
