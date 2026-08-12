/**
 * The database, as Drizzle sees it.
 *
 * This is a transcription of what @astrojs/db had already created in Turso, not
 * a fresh design: every table name, column name, type, default and index name
 * matches the live schema, because the data is already there and has to keep
 * reading. `drizzle-kit generate` diffs against this file, so a drift here
 * would be written into a migration and run against production.
 *
 * The exported names match the ones `astro:db` used, which is why call sites
 * only had to change their import line.
 */

import { sql } from "drizzle-orm";
import {
  customType,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * A date, stored the way Astro DB stored it: an ISO-8601 string in a text
 * column ("2025-12-25T04:07:52.909Z"), handed to the app as a Date.
 *
 * Not `integer({ mode: "timestamp" })` — that would read the existing text as a
 * number and hand back epoch 0 for every row in the table.
 */
const isoDate = customType<{ data: Date; driverData: string }>({
  dataType: () => "text",
  toDriver: (value) => value.toISOString(),
  fromDriver: (value) => new Date(value),
});

export const WishlistItem = sqliteTable("WishlistItem", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  titleRu: text("titleRu"), // Russian translation
  price: text("price").notNull(), // Original price with currency symbol ("$64", "£25", "AU$140")
  imageUrl: text("imageUrl").notNull(),
  imageUrlDark: text("imageUrlDark"), // dark-theme variant; falls back to imageUrl
  description: text("description"),
  descriptionRu: text("descriptionRu"),
  url: text("url"),
  category: text("category").notNull().default("other"),
  // The enum is a TypeScript-level constraint, as it was under Astro DB — the
  // column is plain text in the database, with no CHECK behind it.
  priority: text("priority", { enum: ["high", "medium", "low"] }),
  received: integer("received", { mode: "boolean" }).notNull().default(false),
  createdAt: isoDate("createdAt").notNull(),
  weight: integer("weight").notNull().default(0),
});

/**
 * An extra place the same gift can be bought. The item's own price/url is the
 * first option and owns no row here; a reservation stays on the item, because
 * the gift is one gift whichever shop it comes from.
 */
export const ItemOption = sqliteTable(
  "ItemOption",
  {
    id: integer("id").primaryKey(),
    itemId: integer("itemId")
      .notNull()
      .references(() => WishlistItem.id),
    label: text("label"),
    labelRu: text("labelRu"),
    price: text("price").notNull(),
    url: text("url"),
    position: integer("position").notNull().default(0),
  },
  (table) => [index("ItemOption_itemId_idx").on(table.itemId)],
);

export const ExchangeRate = sqliteTable("ExchangeRate", {
  id: integer("id").primaryKey(),
  fromCurrency: text("fromCurrency").notNull(), // "USD", "EUR", "GBP", "AUD", "KZT"
  toCurrency: text("toCurrency").notNull(), // "RUB"
  /**
   * How many roubles one unit costs: 100 means 1 USD = 100 RUB.
   *
   * Real, not integer — one tenge is about 0.15 roubles, and a currency worth
   * less than a rouble cannot be written down in whole ones. The rates that
   * were integers still read as the same numbers; nothing had to be rescaled.
   */
  rate: real("rate").notNull(),
  updatedAt: isoDate("updatedAt").notNull(),
});

export const Reservation = sqliteTable(
  "Reservation",
  {
    id: integer("id").primaryKey(),
    itemId: integer("itemId")
      .notNull()
      .references(() => WishlistItem.id),
    reservedBy: text("reservedBy").notNull(), // visitor id, the holder's only credential
    reservedAt: isoDate("reservedAt").notNull(),
    // An optional message the reserver leaves for the wishlist owner. Readable
    // by its author and in the admin panel, and nowhere else — see
    // src/pages/api/wishlist/reservations.ts.
    message: text("message"),
  },
  // One reservation per item: the index is what makes a second reserver lose
  // the race rather than both of them buying the same present.
  (table) => [uniqueIndex("Reservation_itemId_idx").on(table.itemId)],
);

export const AdminCredential = sqliteTable("AdminCredential", {
  id: text("id").primaryKey(), // Base64URL credential ID
  publicKey: text("publicKey").notNull(), // Base64URL encoded COSE public key
  counter: integer("counter").notNull(), // Signature counter for replay protection
  transports: text("transports"), // JSON array of transports
  createdAt: isoDate("createdAt").notNull(),
  lastUsedAt: isoDate("lastUsedAt"),
  deviceName: text("deviceName"),
});

export const AdminSession = sqliteTable(
  "AdminSession",
  {
    id: text("id").primaryKey(), // Cryptographically random session ID
    credentialId: text("credentialId")
      .notNull()
      .references(() => AdminCredential.id),
    expiresAt: isoDate("expiresAt").notNull(),
    createdAt: isoDate("createdAt").notNull(),
    userAgent: text("userAgent"),
  },
  (table) => [
    index("AdminSession_expiresAt_idx").on(table.expiresAt),
    index("AdminSession_credentialId_idx").on(table.credentialId),
  ],
);

/**
 * Claim the next id for a table whose ids are assigned rather than autoincrement
 * — the pattern every insert here used under Astro DB, kept because the rows
 * carry ids that seeds and fixtures refer to by number.
 */
export const nextId = (table: string) =>
  sql.raw(`COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1`);
