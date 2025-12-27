import { expect, test } from "vitest";
import {
  getCities,
  getCountries,
  getCountryListSize,
  groupTripsByYear,
  getSortedYears,
  formatTripDate,
  type Trip,
} from "./index";

const mockedTripsData: Trip[] = [
  {
    year: 2020,
    month: 3,
    endMonth: null,
    destinations: [
      {
        cities: ["City 3"],
        country: ["yy", "yyy"],
      },
    ],
  },
  {
    year: 2018,
    month: 9,
    endMonth: null,
    destinations: [
      {
        cities: ["City 1"],
        country: ["xx", "xxx"],
      },
    ],
  },
  {
    year: 2015,
    month: 7,
    endMonth: null,
    destinations: [
      {
        cities: ["City 1", "City 2"],
        country: ["xx", "xxx"],
      },
    ],
  },
  {
    year: 2022,
    month: 10,
    endMonth: 12,
    destinations: [
      {
        cities: ["City A", "City B"],
        country: ["aa", "aaa"],
      },
      {
        cities: ["City C"],
        country: ["bb", "bbb"],
      },
    ],
  },
];

test("gets countries", () => {
  expect(getCountries(mockedTripsData)).toEqual(
    new Set(["YYY", "XXX", "AAA", "BBB"]),
  );
});

test("gets cities", () => {
  expect(getCities(mockedTripsData)).toEqual(
    new Set(["City 3", "City 1", "City 2", "City A", "City B", "City C"]),
  );
});

test("gets country list size from markdown string", () => {
  const markdownContent = `
  # Title 1
  ## Title 2
  1. Country
  2. Country
  3. Country
  ## Title 2
  4. Country
  5. Country
  # Title 1
  6. Country

  `;
  expect(getCountryListSize(markdownContent)).toBe(6);
});

test("groups trips by year", () => {
  const grouped = groupTripsByYear(mockedTripsData);
  expect(Object.keys(grouped).sort()).toEqual(["2015", "2018", "2020", "2022"]);
  expect(grouped[2020].length).toBe(1);
  expect(grouped[2022].length).toBe(1);
});

test("gets sorted years descending", () => {
  const grouped = groupTripsByYear(mockedTripsData);
  const years = getSortedYears(grouped);
  expect(years).toEqual([2022, 2020, 2018, 2015]);
});

test("formats trip date - single month", () => {
  const trip: Trip = {
    year: 2024,
    month: 5,
    endMonth: null,
    destinations: [],
  };
  expect(formatTripDate(trip)).toBe("May");
});

test("formats trip date - month range", () => {
  const trip: Trip = {
    year: 2022,
    month: 10,
    endMonth: 12,
    destinations: [],
  };
  expect(formatTripDate(trip)).toBe("Oct - Dec");
});

test("formats trip date - same month in endMonth", () => {
  const trip: Trip = {
    year: 2024,
    month: 7,
    endMonth: 7,
    destinations: [],
  };
  expect(formatTripDate(trip)).toBe("Jul");
});
