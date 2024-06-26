import { expect, test } from "vitest";
import {
  getCities,
  getCountires,
  getCountryListSize,
  getCompletedTrips,
} from "./index";

const mockedTripsData = [
  {
    date: "TBA",
    destination: [
      {
        city: "City 4, City 5, City 6",
        country: ["zz", "zzz"],
      },
    ],
  },
  {
    date: "TBA",
    destination: [
      {
        city: "City 3",
        country: ["yy", "yyy"],
      },
    ],
  },
  {
    date: "Mar, 2020",
    destination: [
      {
        city: "City 3",
        country: ["yy", "yyy"],
      },
    ],
  },
  {
    date: "Sep, 2018",
    destination: [
      {
        city: "City 1",
        country: ["xx", "xxx"],
      },
    ],
  },
  {
    date: "Jul, 2015",
    destination: [
      {
        city: "City 1, City 2",
        country: ["xx", "xxx"],
      },
    ],
  },
];

test("gets completed trips", () => {
  expect(getCompletedTrips(mockedTripsData)).toEqual([
    {
      date: "Mar, 2020",
      destination: [
        {
          city: "City 3",
          country: ["yy", "yyy"],
        },
      ],
    },
    {
      date: "Sep, 2018",
      destination: [
        {
          city: "City 1",
          country: ["xx", "xxx"],
        },
      ],
    },
    {
      date: "Jul, 2015",
      destination: [
        {
          city: "City 1, City 2",
          country: ["xx", "xxx"],
        },
      ],
    },
  ]);
});

test("gets countries", () => {
  expect(getCountires(mockedTripsData)).toEqual(new Set(["ZZZ", "YYY", "XXX"]));
});

test("gets cities", () => {
  expect(getCities(mockedTripsData)).toEqual(
    new Set(["City 4", "City 5", "City 6", "City 3", "City 1", "City 2"])
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
