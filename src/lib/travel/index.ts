import tripsData from "./trips.json";
import citiesData from "./cities.json";
import landmarksData from "./landmarks.json";
import countryListRaw from "../../pages/travel/countries.md?raw";
import { getCityName } from "./cities-i18n";

// Types for the new trip format
export interface Destination {
  country: [string, string]; // [alpha-2, alpha-3]
  cities: string[];
  // Slugs into landmarks.json. Landmarks are areal, not route steps — they sit
  // around the journey rather than on it, so they are kept out of `cities` and
  // never counted toward the cities stat.
  landmarks?: string[];
}

export interface Trip {
  year: number | null;
  month: number | null;
  endYear?: number | null;
  endMonth: number | null;
  description?: string;
  destinations: Destination[];
  // A day out from where I live rather than a journey to somewhere new. Since
  // moving to Almaty in Jan 2023 the places around it are reached from home, so
  // they have no trip to hang on — but they still happened on a date, and a
  // landmark has no date of its own (it inherits the entry's). Recording them
  // as entries keeps that date truthful; this flag keeps them distinguishable
  // from real travel if the timeline ever wants to render them differently.
  // Country and city stats are Sets, so a repeat entry cannot inflate them.
  kind?: "outing";
}

// Month names for formatting
const MONTH_NAMES_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_NAMES_RU = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
];

export function formatTripDate(trip: Trip, lang: "en" | "ru" = "en"): string {
  // TBA trips
  if (trip.year === null || trip.month === null) {
    return "TBA";
  }

  const monthNames = lang === "ru" ? MONTH_NAMES_RU : MONTH_NAMES_EN;
  const startMonth = monthNames[trip.month - 1];

  // Trip spans multiple months (same year or across years)
  if (trip.endMonth && trip.endMonth !== trip.month) {
    const endMonth = monthNames[trip.endMonth - 1];
    return `${startMonth} - ${endMonth}`;
  }

  return startMonth;
}

export function getCountries(data: Trip[]) {
  const visitedCodes = data
    .flatMap((trip) => trip.destinations)
    .map((dest) => dest.country[1].toUpperCase());

  return new Set(visitedCodes);
}

export function getCities(data: Trip[]) {
  return new Set(
    data.flatMap((trip) => trip.destinations).flatMap((dest) => dest.cities),
  );
}

export interface Landmark {
  en: string;
  ru: string;
  coords: [number, number];
  kind: string;
}

// Unlike cities (whose coords and translations live in two separate files for
// legacy reasons), a landmark is one self-contained record.
export const landmarkData = landmarksData as unknown as Record<string, Landmark>;

export function getLandmarkName(slug: string, lang: "en" | "ru"): string {
  const entry = landmarkData[slug];
  return entry ? entry[lang] : slug;
}

export function getLandmarks(data: Trip[]) {
  return new Set(
    data
      .flatMap((trip) => trip.destinations)
      .flatMap((dest) => dest.landmarks ?? []),
  );
}

export function getCountryListSize(markdownContent: string) {
  const regex = /^\s*\d+\.\s*/gm;
  const matches = markdownContent.trim().match(regex);

  if (matches && matches.length > 0) {
    const lastItem = matches[matches.length - 1];
    return parseInt(lastItem.match(/\d+/)![0]);
  }

  return -1;
}

// Separate TBA trips from dated trips
export function getTbaTrips(data: Trip[]): Trip[] {
  return data.filter((trip) => trip.year === null);
}

// Get only dated trips (non-TBA)
export function getDatedTrips(data: Trip[]): Trip[] {
  return data.filter((trip) => trip.year !== null);
}

// Group trips by year (only dated trips)
export function groupTripsByYear(data: Trip[]): Record<number, Trip[]> {
  return getDatedTrips(data).reduce(
    (acc, trip) => {
      const year = trip.year as number;
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(trip);
      return acc;
    },
    {} as Record<number, Trip[]>,
  );
}

// Get sorted years (descending)
export function getSortedYears(tripsByYear: Record<number, Trip[]>): number[] {
  return Object.keys(tripsByYear)
    .map(Number)
    .sort((a, b) => b - a);
}

// Cities where I lived (not part of trips)
const homeCities = ["Moscow", "Murom"];

// Country names for display
const COUNTRY_NAMES: Record<string, { en: string; ru: string }> = {
  RUS: { en: "Russia", ru: "Россия" },
  ESP: { en: "Spain", ru: "Испания" },
  FRA: { en: "France", ru: "Франция" },
  DEU: { en: "Germany", ru: "Германия" },
  ITA: { en: "Italy", ru: "Италия" },
  PRT: { en: "Portugal", ru: "Португалия" },
  AUT: { en: "Austria", ru: "Австрия" },
  CHE: { en: "Switzerland", ru: "Швейцария" },
  NLD: { en: "Netherlands", ru: "Нидерланды" },
  BEL: { en: "Belgium", ru: "Бельгия" },
  POL: { en: "Poland", ru: "Польша" },
  CZE: { en: "Czechia", ru: "Чехия" },
  SVK: { en: "Slovakia", ru: "Словакия" },
  HUN: { en: "Hungary", ru: "Венгрия" },
  GBR: { en: "United Kingdom", ru: "Великобритания" },
  FIN: { en: "Finland", ru: "Финляндия" },
  SWE: { en: "Sweden", ru: "Швеция" },
  EST: { en: "Estonia", ru: "Эстония" },
  LVA: { en: "Latvia", ru: "Латвия" },
  LTU: { en: "Lithuania", ru: "Литва" },
  BLR: { en: "Belarus", ru: "Беларусь" },
  MDA: { en: "Moldova", ru: "Молдова" },
  TUR: { en: "Türkiye", ru: "Турция" },
  ARE: { en: "UAE", ru: "ОАЭ" },
  KAZ: { en: "Kazakhstan", ru: "Казахстан" },
  UZB: { en: "Uzbekistan", ru: "Узбекистан" },
  CHN: { en: "China", ru: "Китай" },
  VAT: { en: "Vatican", ru: "Ватикан" },
  HKG: { en: "Hong Kong", ru: "Гонконг" },
  MAC: { en: "Macao", ru: "Макао" },
  SJM: { en: "Svalbard", ru: "Шпицберген" },
  ALB: { en: "Albania", ru: "Албания" },
  BIH: { en: "Bosnia and Herzegovina", ru: "Босния и Герцеговина" },
  DNK: { en: "Denmark", ru: "Дания" },
  EGY: { en: "Egypt", ru: "Египет" },
  IND: { en: "India", ru: "Индия" },
  ISL: { en: "Iceland", ru: "Исландия" },
  JPN: { en: "Japan", ru: "Япония" },
  KGZ: { en: "Kyrgyzstan", ru: "Кыргызстан" },
  KOR: { en: "South Korea", ru: "Южная Корея" },
  LKA: { en: "Sri Lanka", ru: "Шри-Ланка" },
  MAR: { en: "Morocco", ru: "Марокко" },
  MNE: { en: "Montenegro", ru: "Черногория" },
  MYS: { en: "Malaysia", ru: "Малайзия" },
  NOR: { en: "Norway", ru: "Норвегия" },
  SRB: { en: "Serbia", ru: "Сербия" },
  THA: { en: "Thailand", ru: "Таиланд" },
  TJK: { en: "Tajikistan", ru: "Таджикистан" },
  TWN: { en: "Taiwan", ru: "Тайвань" },
  VNM: { en: "Vietnam", ru: "Вьетнам" },
};

// Country display name by alpha-3 code (case-insensitive), language-aware.
// Falls back to the upper-cased code if a name is not yet defined.
export function getCountryName(a3: string, lang: "en" | "ru"): string {
  const entry = COUNTRY_NAMES[a3.toUpperCase()];
  return entry ? entry[lang] : a3.toUpperCase();
}

export interface CountryWithCities {
  code: string;
  a2: string;
  name: { en: string; ru: string };
  cities: string[];
  tripCount: number;
}

// Get visited countries with their cities
export function getCountriesWithCities(data: Trip[]): CountryWithCities[] {
  const countryMap = new Map<
    string,
    { a2: string; cities: Set<string>; tripCount: number }
  >();

  for (const trip of data) {
    for (const dest of trip.destinations) {
      const [a2, a3] = dest.country;
      const code = a3.toUpperCase();

      if (!countryMap.has(code)) {
        countryMap.set(code, { a2, cities: new Set(), tripCount: 0 });
      }

      const entry = countryMap.get(code)!;
      entry.tripCount++;
      for (const city of dest.cities) {
        entry.cities.add(city);
      }
    }
  }

  // Convert to array and sort by city count (descending)
  return Array.from(countryMap.entries())
    .map(([code, data]) => ({
      code,
      a2: data.a2,
      name: COUNTRY_NAMES[code] || { en: code, ru: code },
      cities: Array.from(data.cities).sort(),
      tripCount: data.tripCount,
    }))
    .sort((a, b) => b.cities.length - a.cities.length);
}

// -----------------------------------------------------------------------------
// Continents
// -----------------------------------------------------------------------------

export type ContinentId =
  | "europe"
  | "asia"
  | "africa"
  | "north-america"
  | "south-america"
  | "oceania"
  | "antarctica";

export interface ContinentReference {
  id: ContinentId;
  name: { en: string; ru: string };
  /** Sovereign states + UN observer states on this continent. */
  total: number;
}

// The seven continents of the National Geographic model — the same model the
// "Continents 2 / 7" stat card links out to, so the two never disagree about
// how many there are. The totals are the conventional 195-country tally (193 UN
// member states + the Vatican and Palestine as observers) split across them;
// they sum to 195 exactly, which is the check that keeps this table honest.
//
// Deliberately NOT derived from countries.ts: 21 of its 193 entries carry no
// continent at all and every Oceanian state bar Australia is among them, so a
// derived Oceania total would read 1. Several of its entries also carry "XX"
// placeholder ISO codes (Zambia, Zimbabwe and others), which is why the lookup
// below goes by alpha-3 through a table of our own rather than through
// countries.ts — getByCode("CHE") and getByCode("GBR") both come back
// undefined there, which would quietly file Switzerland and the UK nowhere.
const CONTINENTS: ContinentReference[] = [
  { id: "europe", name: { en: "Europe", ru: "Европа" }, total: 44 },
  { id: "asia", name: { en: "Asia", ru: "Азия" }, total: 48 },
  { id: "africa", name: { en: "Africa", ru: "Африка" }, total: 54 },
  {
    id: "north-america",
    name: { en: "North America", ru: "Северная Америка" },
    total: 23,
  },
  {
    id: "south-america",
    name: { en: "South America", ru: "Южная Америка" },
    total: 12,
  },
  {
    id: "oceania",
    name: { en: "Australia & Oceania", ru: "Австралия и Океания" },
    total: 14,
  },
  {
    id: "antarctica",
    name: { en: "Antarctica", ru: "Антарктида" },
    total: 0,
  },
];

// Continent per alpha-3 code, covering every country COUNTRY_NAMES can name.
// Russia sits in Europe and Türkiye and Kazakhstan in Asia, matching the split
// the 195-country totals above are counted under; putting a transcontinental
// country on the other side would make one continent's fraction overshoot.
const COUNTRY_CONTINENTS: Record<string, ContinentId> = {
  ALB: "europe",
  ARE: "asia",
  AUT: "europe",
  BEL: "europe",
  BIH: "europe",
  BLR: "europe",
  CHE: "europe",
  CHN: "asia",
  CZE: "europe",
  DEU: "europe",
  DNK: "europe",
  EGY: "africa",
  ESP: "europe",
  EST: "europe",
  FIN: "europe",
  FRA: "europe",
  GBR: "europe",
  HKG: "asia",
  HUN: "europe",
  IND: "asia",
  ISL: "europe",
  ITA: "europe",
  JPN: "asia",
  KAZ: "asia",
  KGZ: "asia",
  KOR: "asia",
  LKA: "asia",
  LTU: "europe",
  LVA: "europe",
  MAC: "asia",
  MAR: "africa",
  MDA: "europe",
  MNE: "europe",
  MYS: "asia",
  NLD: "europe",
  NOR: "europe",
  POL: "europe",
  PRT: "europe",
  RUS: "europe",
  SJM: "europe",
  SRB: "europe",
  SVK: "europe",
  SWE: "europe",
  THA: "asia",
  TJK: "asia",
  TUR: "asia",
  TWN: "asia",
  UZB: "asia",
  VAT: "europe",
  VNM: "asia",
};

// Places that are on a continent but are not among the 195 the totals count:
// two Chinese special administrative regions, a Norwegian territory, and a
// state no UN seat recognises. They still appear in their continent's list —
// they were visited — but counting them in the numerator would compare against
// a denominator that never had room for them, and enough of them would push a
// continent past 100%.
const OUTSIDE_CONTINENT_TOTALS = new Set(["HKG", "MAC", "SJM", "TWN"]);

export interface ContinentGroup {
  id: ContinentId;
  name: { en: string; ru: string };
  /** Countries counted by the continent's total. Never exceeds `total`. */
  visited: number;
  total: number;
  countries: CountryWithCities[];
}

// Visited countries grouped under their continent. All seven are returned,
// including the ones with nothing under them — the view is a map of where
// there is still to go as much as where I've been, and an absent Africa row
// would read as a rendering bug rather than as zero.
export function getCountriesByContinent(data: Trip[]): ContinentGroup[] {
  const byContinent = new Map<ContinentId, CountryWithCities[]>();

  // Most cities first, then alphabetically. Half of Europe is a one-city
  // country, and without the second key their order falls out of where their
  // trips happen to sit in trips.json — so editing one journey would reshuffle
  // the tail of the list for no reason a reader could see.
  const ranked = [...getCountriesWithCities(data)].sort(
    (a, b) =>
      b.cities.length - a.cities.length || a.name.en.localeCompare(b.name.en),
  );

  for (const country of ranked) {
    const id = COUNTRY_CONTINENTS[country.code];
    if (!id) continue;
    if (!byContinent.has(id)) byContinent.set(id, []);
    byContinent.get(id)!.push(country);
  }

  const referenceOrder = new Map(CONTINENTS.map((c, i) => [c.id, i]));

  return CONTINENTS.map((continent): ContinentGroup => {
    const countries = byContinent.get(continent.id) ?? [];
    return {
      id: continent.id,
      name: continent.name,
      visited: countries.filter(
        (country) => !OUTSIDE_CONTINENT_TOTALS.has(country.code),
      ).length,
      total: continent.total,
      countries,
    };
  }).sort(
    // Continents I've actually been to come first; the rest keep the reference
    // order above so the empty tail is stable rather than alphabetical noise.
    (a, b) =>
      b.countries.length - a.countries.length ||
      referenceOrder.get(a.id)! - referenceOrder.get(b.id)!,
  );
}

// Visited countries that COUNTRY_CONTINENTS has no entry for. They would be
// dropped from the continents view without a trace, and the per-continent
// fractions would still add up, so nothing on the page would look wrong. The
// test pins this to empty; adding a country to trips.json without adding it
// here is what it is there to catch.
export function getUnmappedCountries(data: Trip[]): string[] {
  return getCountriesWithCities(data)
    .map((country) => country.code)
    .filter((code) => !COUNTRY_CONTINENTS[code])
    .sort();
}

// -----------------------------------------------------------------------------
// Stats & facts
// -----------------------------------------------------------------------------

export interface VisitedPlace {
  name: { en: string; ru: string };
  a2: string;
  visits: number;
}

export interface TravelFacts {
  mostVisitedCity: VisitedPlace | null;
  mostVisitedCountry: VisitedPlace | null;
  mostActiveYear: { year: number; trips: number } | null;
  latestNewCountry: {
    name: { en: string; ru: string };
    a2: string;
    year: number;
    month: number;
  } | null;
  /** Every year with at least one trip, oldest first. */
  tripsByYear: { year: number; trips: number }[];
}

// Picks the entry with the highest count, falling back to the lowest key — the
// first name alphabetically, or the earliest year. Without the tie-break the
// answer would fall out of Map insertion order, i.e. out of the order the trips
// happen to sit in trips.json, so editing an unrelated trip could silently
// change which city the page calls the most visited one.
function pickTop<K extends string | number, V>(
  counts: Map<K, V>,
  countOf: (value: V) => number,
) {
  return [...counts.entries()].sort(
    ([keyA, a], [keyB, b]) =>
      countOf(b) - countOf(a) || (keyA < keyB ? -1 : keyA > keyB ? 1 : 0),
  )[0];
}

export function getTravelFacts(data: Trip[]): TravelFacts {
  const cityVisits = new Map<string, { a2: string; trips: number }>();
  const countryVisits = new Map<string, { a2: string; trips: number }>();
  const tripsPerYear = new Map<number, number>();
  const firstVisits = new Map<
    string,
    { a2: string; year: number; month: number }
  >();

  const chronological = [...getDatedTrips(data)].sort(
    (a, b) => a.year! - b.year! || (a.month ?? 0) - (b.month ?? 0),
  );

  for (const trip of chronological) {
    const year = trip.year!;
    tripsPerYear.set(year, (tripsPerYear.get(year) ?? 0) + 1);

    // Counted once per trip, not once per destination: the Oct 2024 trip
    // reaches England and Scotland as two destinations under the same alpha-3,
    // and counting rows would report two visits to the United Kingdom for one
    // journey. The same guard covers a route that returns to a city it already
    // passed through.
    const countriesThisTrip = new Map<string, string>();
    const citiesThisTrip = new Map<string, string>();

    for (const dest of trip.destinations) {
      const [a2, a3] = dest.country;
      const code = a3.toUpperCase();
      if (!countriesThisTrip.has(code)) countriesThisTrip.set(code, a2);
      for (const city of dest.cities) {
        if (!citiesThisTrip.has(city)) citiesThisTrip.set(city, a2);
      }
    }

    for (const [code, a2] of countriesThisTrip) {
      const entry = countryVisits.get(code);
      if (entry) entry.trips++;
      else countryVisits.set(code, { a2, trips: 1 });

      if (!firstVisits.has(code)) {
        firstVisits.set(code, { a2, year, month: trip.month ?? 1 });
      }
    }

    for (const [city, a2] of citiesThisTrip) {
      const entry = cityVisits.get(city);
      if (entry) entry.trips++;
      else cityVisits.set(city, { a2, trips: 1 });
    }
  }

  const topCity = pickTop(cityVisits, (entry) => entry.trips);
  const topCountry = pickTop(countryVisits, (entry) => entry.trips);
  const topYear = pickTop(tripsPerYear, (count) => count);

  // The most recent country seen for the first time. Nothing filters out trips
  // dated in the future, because there are none to filter: a journey that has
  // not happened yet is recorded with a null year and lives in the TBA list,
  // which getDatedTrips already drops.
  const newest = [...firstVisits.entries()].sort(
    ([codeA, a], [codeB, b]) =>
      b.year - a.year || b.month - a.month || codeA.localeCompare(codeB),
  )[0];

  return {
    mostVisitedCity: topCity
      ? {
          name: { en: topCity[0], ru: getCityName(topCity[0], "ru") },
          a2: topCity[1].a2,
          visits: topCity[1].trips,
        }
      : null,
    mostVisitedCountry: topCountry
      ? {
          name: {
            en: getCountryName(topCountry[0], "en"),
            ru: getCountryName(topCountry[0], "ru"),
          },
          a2: topCountry[1].a2,
          visits: topCountry[1].trips,
        }
      : null,
    mostActiveYear: topYear ? { year: topYear[0], trips: topYear[1] } : null,
    latestNewCountry: newest
      ? {
          name: {
            en: getCountryName(newest[0], "en"),
            ru: getCountryName(newest[0], "ru"),
          },
          a2: newest[1].a2,
          year: newest[1].year,
          month: newest[1].month,
        }
      : null,
    tripsByYear: [...tripsPerYear.entries()]
      .map(([year, trips]) => ({ year, trips }))
      .sort((a, b) => a.year - b.year),
  };
}

// -----------------------------------------------------------------------------
// Counted nouns
// -----------------------------------------------------------------------------

// Russian agrees a noun with the number in front of it three ways, so "17
// поездок", "2 поездки" and "1 поездка" are all needed for the same label — an
// English-shaped `${n} ${word}` would print "17 поездка" on the Russian page.
function pluralRu(n: number, [one, few, many]: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function formatTripCount(n: number, lang: "en" | "ru"): string {
  if (lang === "ru") {
    return `${n} ${pluralRu(n, ["поездка", "поездки", "поездок"])}`;
  }
  return `${n} ${n === 1 ? "trip" : "trips"}`;
}

export function formatVisitCount(n: number, lang: "en" | "ru"): string {
  if (lang === "ru") {
    return `${n} ${pluralRu(n, ["визит", "визита", "визитов"])}`;
  }
  return `${n} ${n === 1 ? "visit" : "visits"}`;
}

export function formatCityCount(n: number, lang: "en" | "ru"): string {
  if (lang === "ru") {
    return `${n} ${pluralRu(n, ["город", "города", "городов"])}`;
  }
  return `${n} ${n === 1 ? "city" : "cities"}`;
}

export function formatMonthYear(
  year: number,
  month: number,
  lang: "en" | "ru",
): string {
  const monthNames = lang === "ru" ? MONTH_NAMES_RU : MONTH_NAMES_EN;
  return `${monthNames[month - 1]} ${year}`;
}

export const trips = tripsData as Trip[];
export const datedTrips = getDatedTrips(trips);
export const tripsCount = datedTrips.length;
export const countries = getCountries(datedTrips);
export const cities = new Set([...getCities(datedTrips), ...homeCities]);
export const visitedLandmarks = getLandmarks(datedTrips);
export const cityCoordinates = citiesData as unknown as Record<
  string,
  [number, number]
>;
export const countryListSize = getCountryListSize(countryListRaw);
// Both were literals — a 2 that had to be remembered and bumped by hand the
// first time a trip reached a third continent, and a 7 sitting one file away
// from the table that actually lists them. The continents view has to work out
// which continents have a country under them anyway, so the stat card reads
// its number off the same answer and the two can no longer disagree.
export const continentsVisited = getCountriesByContinent(datedTrips).filter(
  (continent) => continent.countries.length > 0,
).length;
export const continentsTotal = CONTINENTS.length;
