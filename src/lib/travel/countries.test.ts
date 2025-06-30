import { expect, test } from "vitest";
import { getList, findOne, findMany, getByCode } from "./countries";

test("returns a whole list of countries", () => {
  expect(getList().toSet().size).toBe(193);
});

test("finds one by name", () => {
  expect(findOne("czechia")).toEqual({
    A2: "CZ",
    A3: "CZE",
    continent: "Europe",
    name: "Czech Republic (Czechia)",
    officialName: "Czech Republic (Czechia)",
  });
});

test("finds many by name", () => {
  expect(findMany("united")).toEqual([
    {
      A2: "XX",
      A3: "XXX",
      continent: "North America",
      name: "Mexico",
      officialName: "United Mexican States (Mexico)",
    },
    {
      A2: "AE",
      A3: "ARE",
      continent: "Asia",
      name: "United Arab Emirates",
      officialName: "United Arab Emirates",
    },
    {
      A2: "XX",
      A3: "XXX",
      continent: "Europe",
      name: "United Kingdom",
      officialName: "United Kingdom of Great Britain and Northern Ireland",
    },
    {
      A2: "XX",
      A3: "XXX",
      continent: "Africa",
      name: "Tanzania",
      officialName: "United Republic of Tanzania",
    },
    {
      A2: "XX",
      A3: "XXX",
      continent: "North America",
      name: "United States",
      officialName: "United States of America",
    },
  ]);
});

test("get by A2 or A3 code", () => {
  const expected = {
    A2: "EC",
    A3: "ECU",
    continent: "South America",
    name: "Ecuador",
    officialName: "Republic of Ecuador",
  };
  expect(getByCode("ECU")).toEqual(expected);
  expect(getByCode("ecu")).toEqual(expected);
  expect(getByCode("EC")).toEqual(expected);
  expect(getByCode("ec")).toEqual(expected);
});
