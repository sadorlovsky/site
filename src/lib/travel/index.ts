import tripsData from "./trips.json";
import citiesData from "./cities.json";
import * as countryList from "../../pages/travel/countries.md";

// Types for the new trip format
export interface Destination {
  country: [string, string]; // [alpha-2, alpha-3]
  cities: string[];
}

export interface Trip {
  year: number | null;
  month: number | null;
  endYear?: number | null;
  endMonth: number | null;
  description?: string;
  destinations: Destination[];
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
};

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

export const trips = tripsData as Trip[];
export const datedTrips = getDatedTrips(trips);
export const tripsCount = datedTrips.length;
export const countries = getCountries(datedTrips);
export const cities = new Set([...getCities(datedTrips), ...homeCities]);
export const cityCoordinates = citiesData as unknown as Record<
  string,
  [number, number]
>;
export const countryListSize = getCountryListSize(countryList.rawContent());
export const continentsVisited = 2;
export const continentsTotal = 7;
