import tripsData from "./trips.json";

export function getCountires(data: typeof tripsData) {
  return new Set(
    data
      .flatMap((trip) => trip.destination)
      .map((dest) => dest.country[1].toUpperCase())
  );
}

export function getCities(data: typeof tripsData) {
  return new Set(
    data
      .flatMap((trip) => trip.destination)
      .map((dest) => dest.city)
      .flatMap((cities) => cities.split(","))
      .map((city) => city.trim())
  );
}

export function getCompletedTrips(data: typeof tripsData) {
  return data.filter((trip) => trip.date !== "TBA");
}

export const trips = getCompletedTrips(tripsData);
export const countries = getCountires(trips);
export const cities = getCities(trips);
