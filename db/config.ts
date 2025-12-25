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

// https://astro.build/db/config
export default defineDb({
  tables: { WishlistItem, Reservation, ExchangeRate },
});
