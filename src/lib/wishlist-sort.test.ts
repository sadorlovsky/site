import { expect, test } from "vitest";
import { comparePublic, compareAdmin, type SortableItem } from "./wishlist-sort";

function item(fields: Partial<SortableItem> & { id: number }): SortableItem {
  return {
    received: false,
    weight: 0,
    createdAt: new Date("2026-01-01"),
    ...fields,
  };
}

const ids = (items: SortableItem[]) => items.map((i) => i.id);

test("puts heavier items first", () => {
  const items = [
    item({ id: 1, weight: 1 }),
    item({ id: 2, weight: 5 }),
    item({ id: 3, weight: 3 }),
  ];

  expect(ids([...items].sort(comparePublic))).toEqual([2, 3, 1]);
});

test("sinks received items regardless of weight", () => {
  const items = [
    item({ id: 1, weight: 99, received: true }),
    item({ id: 2, weight: 1 }),
  ];

  expect(ids([...items].sort(comparePublic))).toEqual([2, 1]);
});

test("breaks a weight tie with the newer item", () => {
  const items = [
    item({ id: 1, weight: 2, createdAt: new Date("2026-01-01") }),
    item({ id: 2, weight: 2, createdAt: new Date("2026-06-01") }),
  ];

  expect(ids([...items].sort(comparePublic))).toEqual([2, 1]);
});

test("orders received items among themselves too", () => {
  const items = [
    item({ id: 1, weight: 1, received: true }),
    item({ id: 2, weight: 7, received: true }),
  ];

  expect(ids([...items].sort(comparePublic))).toEqual([2, 1]);
});

test("floats reserved items to the top of the admin's list", () => {
  const items = [
    item({ id: 1, createdAt: new Date("2026-06-01") }),
    item({ id: 2, createdAt: new Date("2026-01-01") }),
    item({ id: 3, createdAt: new Date("2026-03-01") }),
  ];
  const reserved = new Set([2]);

  expect(ids([...items].sort(compareAdmin(reserved)))).toEqual([2, 1, 3]);
});

test("ignores weight in the admin's list", () => {
  const items = [
    item({ id: 1, weight: 0, createdAt: new Date("2026-06-01") }),
    item({ id: 2, weight: 99, createdAt: new Date("2026-01-01") }),
  ];

  expect(ids([...items].sort(compareAdmin(new Set())))).toEqual([1, 2]);
});
