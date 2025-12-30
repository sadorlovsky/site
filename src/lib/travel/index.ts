import tripsData from "./trips.json";
import * as countryList from "../../pages/travel/countries.md";

// Types for the new trip format
export interface Destination {
  country: [string, string]; // [alpha-2, alpha-3]
  cities: string[];
}

export interface Trip {
  year: number;
  month: number;
  endYear?: number | null;
  endMonth: number | null;
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

// Group trips by year
export function groupTripsByYear(data: Trip[]): Record<number, Trip[]> {
  return data.reduce(
    (acc, trip) => {
      if (!acc[trip.year]) {
        acc[trip.year] = [];
      }
      acc[trip.year].push(trip);
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

export const trips = tripsData as Trip[];
export const tripsCount = trips.length;
export const countries = getCountries(trips);
export const cities = getCities(trips);
export const countryListSize = getCountryListSize(countryList.rawContent());
export const continentsVisited = 2;
export const continentsTotal = 7;
