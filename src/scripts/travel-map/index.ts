import { Map } from "maplibre-gl";
import {
  countriesFillLayer,
  crimeaFillLayer,
  getBackgroundLayer,
} from "./layers";

let zoom = document.body.clientWidth <= 480 ? 1 : 2;

const map = new Map({
  container: "map",
  style: "/maptiles.json",
  center: [43, 55],
  zoom,
  attributionControl: false,
});

let colorScheme: "dark" | "light" =
  window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (event) => {
    colorScheme = event.matches ? "dark" : "light";
    map.removeLayer("background");
    map.addLayer(getBackgroundLayer(colorScheme) as any, "coastline");
  });

map.on("load", () => {
  map.addLayer(getBackgroundLayer(colorScheme) as any, "coastline");
  map.addLayer(countriesFillLayer as any, "countries-boundary");
  map.addLayer(crimeaFillLayer as any);
});

map.on("sourcedata", (event) => {
  if (event.sourceId === "maplibre" && event.isSourceLoaded) {
    const placeholder = document.querySelector(
      "#placeholder"
    ) as HTMLDivElement;
    placeholder.style.opacity = "0";
  }
});
