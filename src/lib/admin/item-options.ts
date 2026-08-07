import { db, ItemOption, eq, sql } from "astro:db";
import { z } from "zod";

/** One extra way to buy an item, as the admin form sends it. */
export const itemOptionSchema = z.object({
  label: z.string().optional(),
  labelRu: z.string().optional(),
  price: z.string().min(1),
  url: z.string().url().optional().or(z.literal("")),
});

export type ItemOptionInput = z.infer<typeof itemOptionSchema>;

/** A stored option as the admin panel wants it back — ids and all. */
export type StoredItemOption = {
  id: number;
  label: string | null;
  labelRu: string | null;
  price: string;
  url: string | null;
  position: number;
};

/**
 * Rewrite an item's extra buying options, in the order given.
 *
 * Replace-all rather than diff: nothing outside the item refers to an option —
 * a reservation hangs off the item, because the gift is one gift no matter
 * which shop it comes from — so the ids are free to churn, and the array the
 * form submits stays the whole truth about the item's options.
 */
export async function replaceItemOptions(
  itemId: number,
  options: ItemOptionInput[],
): Promise<StoredItemOption[]> {
  await db.delete(ItemOption).where(eq(ItemOption.itemId, itemId));

  // Sequential, and each row claims its own id the way every other insert here
  // does — MAX(id) + 1 read inside the statement rather than in JS.
  for (const [position, option] of options.entries()) {
    await db.run(sql`
      INSERT INTO ItemOption (id, itemId, label, labelRu, price, url, position)
      VALUES (
        COALESCE((SELECT MAX(id) FROM ItemOption), 0) + 1,
        ${itemId},
        ${option.label || null},
        ${option.labelRu || null},
        ${option.price},
        ${option.url || null},
        ${position}
      )
    `);
  }

  // Read them back: the ids were minted inside those statements, and the panel
  // updates its own list from what actually landed rather than guessing.
  const stored = await db
    .select()
    .from(ItemOption)
    .where(eq(ItemOption.itemId, itemId));

  return stored
    .sort((a, b) => a.position - b.position || a.id - b.id)
    .map(({ id, label, labelRu, price, url, position }) => ({
      id,
      label,
      labelRu,
      price,
      url,
      position,
    }));
}
