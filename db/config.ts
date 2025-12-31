import { defineDb, defineTable, column } from "astro:db";

const WishlistItem = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    title: column.text(),
    titleRu: column.text({ optional: true }), // Russian translation
    price: column.text(), // Original price with currency symbol (e.g., "$64", "£25", "€300", "AU$140")
    imageUrl: column.text(),
    description: column.text({ optional: true }),
    descriptionRu: column.text({ optional: true }), // Russian translation
    url: column.text({ optional: true }),
    category: column.text({ default: "other" }),
    priority: column.text({ optional: true, enum: ["high", "medium", "low"] }),
    received: column.boolean({ default: false }),
    createdAt: column.date({ default: new Date() }),
    weight: column.number({ default: 0 }),
  },
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
  },
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
    credentialId: column.text(), // FK to AdminCredential
    expiresAt: column.date(),
    createdAt: column.date(),
    userAgent: column.text({ optional: true }),
  },
});

// https://astro.build/db/config
export default defineDb({
  tables: {
    WishlistItem,
    Reservation,
    ExchangeRate,
    AdminCredential,
    AdminSession,
  },
});
