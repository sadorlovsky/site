import tripsData from "./trips.json";

const completedTrips = tripsData.filter((trip) => trip.date !== "TBA");

export const countries = new Set(
  completedTrips
    .flatMap((trip) => trip.destination)
    .map((dest) => dest.country[1].toUpperCase())
);

export const trips = completedTrips;
