import { Map } from "maplibre-gl";
import type { MapGeoJSONFeature } from "maplibre-gl";
import { countries } from "@lib/travel";

const fillCountriesLayer = {
  id: "countries-fill",
  type: "fill",
  paint: {
    "fill-color": [
      "match",
      ["get", "ADM0_A3"],
      Array.from(countries),
      "#f7b267",
      "#B1BBF9",
    ],
  },
  filter: ["all"],
  layout: {
    visibility: "visible",
  },
  source: "maplibre",
  maxzoom: 24,
  "source-layer": "countries",
};

const map = new Map({
  container: "map",
  style: "/maptiles.json",
  center: [43, 55],
  zoom: 2,
  attributionControl: false,
});

let colorScheme =
  window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

const getBackgroundLayer = () => ({
  id: "background",
  type: "background",
  paint: {
    "background-color": colorScheme === "dark" ? "#222222" : "#ebedf0",
  },
  filter: ["all"],
  layout: {
    visibility: "visible",
  },
  maxzoom: 24,
});

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (event) => {
    colorScheme = event.matches ? "dark" : "light";
    map.removeLayer("background");
    map.addLayer(getBackgroundLayer() as any, "coastline");
  });

const crimeaFillLayer = {
  id: "crimea-fill",
  type: "fill",
  source: "crimea",
  paint: {
    "fill-color": "#D6C7FF",
  },
};

map.on("load", () => {
  map.addLayer(getBackgroundLayer() as any, "coastline");
  map.addLayer(fillCountriesLayer as any, "countries-boundary");
  map.addLayer(crimeaFillLayer as any);
});

let hoveredFeature: MapGeoJSONFeature | undefined = undefined;

map.on("mousemove", "countries-fill", (e) => {
  if (e.features?.length && e.features.length > 0) {
    const feature = e.features[0];

    if (hoveredFeature) {
      map.setFeatureState(
        {
          source: hoveredFeature.source,
          sourceLayer: hoveredFeature.sourceLayer,
          id: hoveredFeature.id,
        },
        { hover: false }
      );
    }

    hoveredFeature = feature;

    map.setFeatureState(
      {
        source: feature.source,
        sourceLayer: feature.sourceLayer,
        id: feature.id,
      },
      { hover: true }
    );
  }
});

map.on("mouseleave", "countries-fill", () => {
  if (hoveredFeature) {
    map.setFeatureState(
      {
        source: hoveredFeature.source,
        sourceLayer: hoveredFeature.sourceLayer,
        id: hoveredFeature.id,
      },
      { hover: false }
    );
  }
  hoveredFeature = undefined;
});

map.on("sourcedata", (event) => {
  if (event.sourceId === "maplibre" && event.isSourceLoaded) {
    const placeholder = document.querySelector("#placeholder") as HTMLDivElement;
    placeholder.style.opacity = "0";
  }
});
