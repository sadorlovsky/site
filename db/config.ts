import { defineDb, defineTable, column } from "astro:db";

const WishlistItem = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    title: column.text(),
    titleRu: column.text({ optional: true }), // Russian translation
    price: column.text(), // Original price with currency symbol
    priceUsd: column.number({ optional: true }), // Price in USD
    priceRub: column.number({ optional: true }), // Price in RUB
    imageUrl: column.text(),
    description: column.text({ optional: true }),
    descriptionRu: column.text({ optional: true }), // Russian translation
    url: column.text({ optional: true }),
    category: column.text({ default: "other" }), // "blu-ray" | "vinyl" | "merch" | "shaving" | "home" | "other"
    priority: column.text({ optional: true }), // "high" | "medium" | "low"
    received: column.boolean({ default: false }),
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
  tables: { WishlistItem, Reservation },
});
