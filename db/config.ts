import { defineDb, defineTable, column } from "astro:db";

const WishlistItem = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    title: column.text(),
    price: column.text(),
    imageUrl: column.text(),
    description: column.text({ optional: true }),
    url: column.text({ optional: true }),
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
