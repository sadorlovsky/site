import { expect, test } from "vitest";
import { plural, formatClusterLabel } from "./cluster-label";

test("picks the Russian singular for counts ending in one", () => {
  expect(plural(1, "город", "города", "городов")).toBe("город");
  expect(plural(21, "город", "города", "городов")).toBe("город");
  expect(plural(101, "город", "города", "городов")).toBe("город");
});

test("picks the Russian few-form for counts ending in two through four", () => {
  for (const count of [2, 3, 4, 22, 33, 44, 102]) {
    expect(plural(count, "город", "города", "городов")).toBe("города");
  }
});

test("picks the Russian many-form for everything else", () => {
  for (const count of [0, 5, 9, 10, 20, 25, 100]) {
    expect(plural(count, "город", "города", "городов")).toBe("городов");
  }
});

// The teens are the whole reason this function exists rather than a mod-10
// check: 11, 12, 13 and 14 end in digits that would otherwise claim the
// singular and the few-form.
test("gives the teens the many-form despite their last digit", () => {
  for (const count of [11, 12, 13, 14, 111, 112, 113, 114]) {
    expect(plural(count, "город", "города", "городов")).toBe("городов");
  }
});

test("labels a Russian cluster with the count and the matching form", () => {
  expect(formatClusterLabel(2, "ru")).toBe("2 города");
  expect(formatClusterLabel(5, "ru")).toBe("5 городов");
  expect(formatClusterLabel(11, "ru")).toBe("11 городов");
  expect(formatClusterLabel(21, "ru")).toBe("21 город");
});

test("labels an English cluster with a plain plural", () => {
  expect(formatClusterLabel(1, "en")).toBe("1 city");
  expect(formatClusterLabel(2, "en")).toBe("2 cities");
  expect(formatClusterLabel(21, "en")).toBe("21 cities");
});
