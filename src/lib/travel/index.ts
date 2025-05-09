import tripsData from "./trips.json";
import * as countryList from "../../pages/travel/countries.md";

export function getCountires(data: typeof tripsData) {
  return new Set(
    data
      .flatMap((trip) => trip.destination)
      .map((dest) => dest.country[1].toUpperCase()),
  );
}

export function getCities(data: typeof tripsData) {
  return new Set(
    data
      .flatMap((trip) => trip.destination)
      .map((dest) => dest.city)
      .flatMap((cities) => cities.split(","))
      .map((city) => city.trim()),
  );
}

export function getCompletedTrips(data: typeof tripsData) {
  return data.filter((trip) => trip.date !== "TBA");
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

export const trips = getCompletedTrips(tripsData);
export const countries = getCountires(trips);
export const cities = getCities(trips);
export const countryListSize = getCountryListSize(countryList.rawContent());
