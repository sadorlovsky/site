import { defineDb, defineTable, column } from "astro:db";

const WishlistItem = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    title: column.text(),
    titleRu: column.text({ optional: true }), // Russian translation
    price: column.text(), // Original price with currency symbol (e.g., "$64", "£25", "€300", "AU$140")
    imageUrl: column.text(),
    imageUrlDark: column.text({ optional: true }), // dark-theme variant; falls back to imageUrl
    description: column.text({ optional: true }),
    descriptionRu: column.text({ optional: true }), // Russian translation
    url: column.text({ optional: true }),
    category: column.text({ default: "other" }),
    priority: column.text({ optional: true, enum: ["high", "medium", "low"] }),
    received: column.boolean({ default: false }),
    createdAt: column.date(),
    weight: column.number({ default: 0 }),
  },
});

/**
 * An extra place the same gift can be bought — a second edition of a book, the
 * same record from another shop. The gift is still one gift: reservations stay
 * on the item (see Reservation's unique index), and an option only says "here
 * is another way to get it, for this much".
 *
 * The item's own `price`/`url` are the first option, unlabelled; a row here is
 * always an addition to those, never a replacement. An item with no rows here
 * behaves exactly as it did before options existed.
 */
const ItemOption = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    itemId: column.number({ references: () => WishlistItem.columns.id }),
    // What distinguishes this one — "Penguin hardcover", "signed". Optional:
    // with no label the card falls back to the shop's hostname, which is what
    // it shows for the item's own url anyway.
    label: column.text({ optional: true }),
    labelRu: column.text({ optional: true }),
    price: column.text(), // same format as WishlistItem.price — "$24", "€300"
    url: column.text({ optional: true }),
    // Display order within the item, ascending. Not WishlistItem's `weight`,
    // which sorts descending and means importance.
    position: column.number({ default: 0 }),
  },
  indexes: [{ on: ["itemId"] }],
});

const ExchangeRate = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    fromCurrency: column.text(), // "USD", "EUR", "GBP", "AUD"
    toCurrency: column.text(), // "RUB"
    rate: column.number(), // e.g., 100 means 1 USD = 100 RUB
    updatedAt: column.date(),
  },
});

const Reservation = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    itemId: column.number({ references: () => WishlistItem.columns.id }),
    reservedBy: column.text(), // Name or identifier of person who reserved
    reservedAt: column.date(),
    // An optional message the reserver leaves for the wishlist owner. Readable
    // by its author and in the admin panel, and nowhere else — see
    // src/pages/api/wishlist/reservations.ts.
    message: column.text({ optional: true }),
  },
  indexes: [{ on: ["itemId"], unique: true }],
});

const AdminCredential = defineTable({
  columns: {
    id: column.text({ primaryKey: true }), // Base64URL credential ID
    publicKey: column.text(), // Base64URL encoded COSE public key
    counter: column.number(), // Signature counter for replay protection
    transports: column.text({ optional: true }), // JSON array of transports
    createdAt: column.date(),
    lastUsedAt: column.date({ optional: true }),
    deviceName: column.text({ optional: true }), // User-friendly device name
  },
});

const AdminSession = defineTable({
  columns: {
    id: column.text({ primaryKey: true }), // Cryptographically random session ID
    credentialId: column.text({ references: () => AdminCredential.columns.id }),
    expiresAt: column.date(),
    createdAt: column.date(),
    userAgent: column.text({ optional: true }),
  },
  indexes: [{ on: ["expiresAt"] }, { on: ["credentialId"] }],
});

// https://astro.build/db/config
export default defineDb({
  tables: {
    WishlistItem,
    ItemOption,
    Reservation,
    ExchangeRate,
    AdminCredential,
    AdminSession,
  },
});
