import type { Category } from "@lib/wishlist";

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
}

export interface Reservation {
  itemId: number;
  reservedBy: string;
  reservedAt: Date;
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
  weight: number;
}

export type ExchangeRates = Record<string, number>;

export type { Category };
