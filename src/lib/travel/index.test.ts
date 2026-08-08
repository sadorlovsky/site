import { expect, test } from "vitest";
import {
  getCities,
  getCountries,
  getCountryListSize,
  groupTripsByYear,
  getSortedYears,
  formatTripDate,
  formatCityCount,
  formatMonthYear,
  formatTripCount,
  formatVisitCount,
  getCountriesByContinent,
  getJourneys,
  getTravelFacts,
  getUnmappedCountries,
  continentsTotal,
  continentsVisited,
  countries,
  datedTrips,
  journeys,
  trips,
  tripsCount,
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

// -----------------------------------------------------------------------------
// Continents
// -----------------------------------------------------------------------------

const continentTripsData: Trip[] = [
  {
    year: 2019,
    month: 5,
    endMonth: null,
    destinations: [
      { cities: ["Paris"], country: ["fr", "fra"] },
      { cities: ["Barcelona", "Madrid"], country: ["es", "esp"] },
    ],
  },
  {
    year: 2024,
    month: 4,
    endMonth: null,
    destinations: [{ cities: ["Dubai"], country: ["ae", "are"] }],
  },
];

test("groups visited countries under their continent", () => {
  const groups = getCountriesByContinent(continentTripsData);
  const europe = groups.find((group) => group.id === "europe")!;
  const asia = groups.find((group) => group.id === "asia")!;

  expect(europe.countries.map((c) => c.code)).toEqual(["ESP", "FRA"]);
  expect(europe.visited).toBe(2);
  expect(europe.total).toBe(44);
  expect(asia.countries.map((c) => c.code)).toEqual(["ARE"]);
  expect(asia.visited).toBe(1);
});

test("returns all seven continents, visited ones first", () => {
  const groups = getCountriesByContinent(continentTripsData);
  expect(groups.length).toBe(7);
  expect(groups.map((group) => group.id)).toEqual([
    "europe",
    "asia",
    "africa",
    "north-america",
    "south-america",
    "oceania",
    "antarctica",
  ]);
});

test("the stat card counts the continents the view draws", () => {
  expect(continentsTotal).toBe(7);
  expect(continentsVisited).toBe(
    getCountriesByContinent(datedTrips).filter(
      (group) => group.countries.length > 0,
    ).length,
  );
});

test("continent totals cover the 195 countries the site counts", () => {
  const total = getCountriesByContinent([]).reduce(
    (sum, group) => sum + group.total,
    0,
  );
  expect(total).toBe(195);
});

// A country with no continent would be dropped from the view while the
// per-continent fractions still added up, so nothing on the page would look
// wrong. Two guards, because the interesting failure is a data edit rather
// than a code one: the build refuses to render the view at all, and this names
// the countries that caused it.
test("every visited country has a continent", () => {
  expect(getUnmappedCountries(trips)).toEqual([]);
});

test("refuses to draw the view with a country it cannot place", () => {
  const unmapped: Trip[] = [
    {
      year: 2024,
      month: 5,
      endMonth: null,
      destinations: [{ cities: ["Nowhere"], country: ["zz", "zzz"] }],
    },
  ];
  expect(getUnmappedCountries(unmapped)).toEqual(["ZZZ"]);
  expect(() => getCountriesByContinent(unmapped)).toThrow("ZZZ");
});

test("every visited country appears under exactly one continent", () => {
  const listed = getCountriesByContinent(datedTrips).flatMap(
    (group) => group.countries,
  );
  expect(new Set(listed.map((c) => c.code)).size).toBe(listed.length);
  expect(listed.length).toBe(countries.size);
});

test("no continent counts more countries than it has", () => {
  for (const group of getCountriesByContinent(datedTrips)) {
    expect(group.visited).toBeLessThanOrEqual(group.total);
  }
});

// -----------------------------------------------------------------------------
// Stats & facts
// -----------------------------------------------------------------------------

const factsTripsData: Trip[] = [
  {
    year: 2021,
    month: 6,
    endMonth: null,
    destinations: [{ cities: ["Saint Petersburg"], country: ["ru", "rus"] }],
  },
  {
    year: 2021,
    month: 9,
    endMonth: null,
    destinations: [{ cities: ["Saint Petersburg"], country: ["ru", "rus"] }],
  },
  {
    // England and Scotland reach the same country twice in one journey.
    year: 2024,
    month: 10,
    endMonth: null,
    destinations: [
      { cities: ["London"], country: ["gb-eng", "gbr"] },
      { cities: ["Edinburgh"], country: ["gb-sct", "gbr"] },
    ],
  },
  {
    year: null,
    month: null,
    endMonth: null,
    destinations: [{ cities: ["Tokyo"], country: ["jp", "jpn"] }],
  },
];

test("counts a country once per trip, not once per destination", () => {
  const facts = getTravelFacts(factsTripsData);
  const uk = facts.tripsByYear.find((entry) => entry.year === 2024)!;
  expect(uk.trips).toBe(1);
  expect(facts.mostVisitedCountry).toEqual({
    name: { en: "Russia", ru: "Россия" },
    a2: "ru",
    visits: 2,
  });
});

test("finds the most visited city", () => {
  expect(getTravelFacts(factsTripsData).mostVisitedCity).toEqual({
    name: { en: "Saint Petersburg", ru: "Санкт-Петербург" },
    a2: "ru",
    visits: 2,
  });
});

test("finds the most active year", () => {
  expect(getTravelFacts(factsTripsData).mostActiveYear).toEqual({
    year: 2021,
    trips: 2,
  });
});

test("finds the latest country seen for the first time", () => {
  expect(getTravelFacts(factsTripsData).latestNewCountry).toEqual({
    name: { en: "United Kingdom", ru: "Великобритания" },
    a2: "gb-eng",
    year: 2024,
    month: 10,
  });
});

// A trip with no date is a plan, not a visit; letting one through would put a
// country I have never been to at the top of "latest new country".
test("ignores TBA trips", () => {
  const facts = getTravelFacts(factsTripsData);
  expect(facts.tripsByYear).toEqual([
    { year: 2021, trips: 2 },
    { year: 2024, trips: 1 },
  ]);
});

test("has no facts to report for an empty history", () => {
  expect(getTravelFacts([])).toEqual({
    mostVisitedCity: null,
    mostVisitedCountry: null,
    mostActiveYear: null,
    latestNewCountry: null,
    tripsByYear: [],
  });
});

// Two afternoons at Shymbulak, recorded so the landmarks have a date to hang
// on. They are entries on the timeline, not journeys.
const outingTripsData: Trip[] = [
  {
    year: 2024,
    month: 8,
    endMonth: null,
    kind: "outing",
    destinations: [
      { cities: ["Almaty"], country: ["kz", "kaz"], landmarks: ["shymbulak"] },
    ],
  },
  {
    year: 2025,
    month: 10,
    endMonth: null,
    kind: "outing",
    destinations: [
      { cities: ["Almaty"], country: ["kz", "kaz"], landmarks: ["shymbulak"] },
    ],
  },
  {
    year: 2026,
    month: 3,
    endMonth: null,
    destinations: [{ cities: ["Almaty"], country: ["kz", "kaz"] }],
  },
];

test("a day out from home is not a trip", () => {
  expect(getJourneys(outingTripsData).map((trip) => trip.year)).toEqual([2026]);

  const facts = getTravelFacts(outingTripsData);
  expect(facts.tripsByYear).toEqual([{ year: 2026, trips: 1 }]);
  expect(facts.mostVisitedCity!.visits).toBe(1);
  expect(facts.mostVisitedCountry!.visits).toBe(1);
});

// An outing is still the day I first stood in the country, so it keeps its
// place in the one fact that is about first sightings rather than counts.
test("a country first seen on an outing keeps that date", () => {
  expect(getTravelFacts(outingTripsData).latestNewCountry).toEqual({
    name: { en: "Kazakhstan", ru: "Казахстан" },
    a2: "kz",
    year: 2024,
    month: 8,
  });
});

test("the trips counter and the by-year bars count the same thing", () => {
  const total = getTravelFacts(trips).tripsByYear.reduce(
    (sum, entry) => sum + entry.trips,
    0,
  );
  expect(total).toBe(tripsCount);
  expect(tripsCount).toBe(journeys.length);
  expect(journeys.every((trip) => trip.kind !== "outing")).toBe(true);
  expect(journeys.length).toBeLessThanOrEqual(datedTrips.length);
});

// -----------------------------------------------------------------------------
// Counted nouns
// -----------------------------------------------------------------------------

test("counts trips in English", () => {
  expect(formatTripCount(1, "en")).toBe("1 trip");
  expect(formatTripCount(17, "en")).toBe("17 trips");
});

test("agrees Russian nouns with the number in front of them", () => {
  expect(formatTripCount(1, "ru")).toBe("1 поездка");
  expect(formatTripCount(3, "ru")).toBe("3 поездки");
  expect(formatTripCount(17, "ru")).toBe("17 поездок");
  expect(formatTripCount(21, "ru")).toBe("21 поездка");
  // The teens are the exception the mod-10 rule alone gets wrong.
  expect(formatTripCount(11, "ru")).toBe("11 поездок");
  expect(formatTripCount(12, "ru")).toBe("12 поездок");
  expect(formatVisitCount(1, "ru")).toBe("1 визит");
  expect(formatVisitCount(2, "ru")).toBe("2 визита");
  expect(formatVisitCount(10, "ru")).toBe("10 визитов");
  expect(formatCityCount(1, "ru")).toBe("1 город");
  expect(formatCityCount(4, "ru")).toBe("4 города");
  expect(formatCityCount(86, "ru")).toBe("86 городов");
});

test("formats a month and year in both languages", () => {
  expect(formatMonthYear(2026, 7, "en")).toBe("Jul 2026");
  expect(formatMonthYear(2026, 7, "ru")).toBe("Июл 2026");
});
