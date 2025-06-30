import { countries } from "@lib/travel";
import type { FillLayer, BackgroundLayer, ColorScheme } from "./types";

/** fill visited and unvisited countries */
export const countriesFillLayer: FillLayer = {
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

/** fill crimea as unvisited */
export const crimeaFillLayer: FillLayer = {
  id: "crimea-fill",
  type: "fill",
  source: "crimea",
  paint: {
    "fill-color": "#B1BBF9",
  },
};

/** fill background */
export const getBackgroundLayer = (
  colorScheme: ColorScheme,
): BackgroundLayer => {
  return {
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
  };
};
