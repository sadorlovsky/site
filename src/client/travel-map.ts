import { Map as MapLibre } from "maplibre-gl";
import { countries, cities, cityCoordinates } from "@lib/travel";

const MOBILE_BREAKPOINT = 480;
const VISITED_COLOR = "#ed6292";
const CITY_COLOR = "#ffffff";
const BORDER_COLOR = "#c74b7a";
const LIGHT_BG = "#f8f8ff";
const DARK_BG = "#191919";
const LIGHT_WATER = "#cad8e6";
const DARK_WATER = "#2a3a4a";
const LIGHT_TEXT = "#333333";
const DARK_TEXT = "#e0e0e0";

async function initMap(): Promise<void> {
  const container = document.getElementById("map");
  if (!container) return;

  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

  const map = new MapLibre({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/positron",
    center: [43, 55],
    zoom: isMobile ? 1 : 2,
    attributionControl: false,
  });

  await new Promise<void>((resolve) => map.on("load", resolve));

  // Add countries source from MapLibre demo tiles
  map.addSource("countries", {
    type: "vector",
    url: "https://demotiles.maplibre.org/tiles/tiles.json",
  });

  // Style map based on color scheme
  const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function applyColorScheme(isDark: boolean): void {
    const bg = isDark ? DARK_BG : LIGHT_BG;
    map.setPaintProperty("background", "background-color", bg);
    map.setPaintProperty(
      "water",
      "fill-color",
      isDark ? DARK_WATER : LIGHT_WATER,
    );

    // Hide parks, forests, residential areas, buildings, and glaciers
    map.setPaintProperty("park", "fill-color", bg);
    map.setPaintProperty("landcover_wood", "fill-color", bg);
    map.setPaintProperty("landuse_residential", "fill-color", bg);
    map.setPaintProperty("building", "fill-color", bg);
    map.setPaintProperty("landcover_ice_shelf", "fill-color", bg);
    map.setPaintProperty("landcover_glacier", "fill-color", bg);

    // Hide roads and railways
    const roadLayers = [
      "highway_path",
      "highway_minor",
      "highway_major_casing",
      "highway_major_inner",
      "highway_major_subtle",
      "highway_motorway_casing",
      "highway_motorway_inner",
      "highway_motorway_subtle",
      "highway_motorway_bridge_casing",
      "highway_motorway_bridge_inner",
      "railway",
      "railway_dashline",
      "railway_transit",
      "railway_transit_dashline",
      "railway_service",
      "railway_service_dashline",
    ];
    for (const layer of roadLayers) {
      map.setPaintProperty(layer, "line-color", bg);
    }

    // Style labels
    const textColor = isDark ? DARK_TEXT : LIGHT_TEXT;
    const labelLayers = [
      "label_country_1",
      "label_country_2",
      "label_country_3",
      "label_city",
      "label_city_capital",
      "label_state",
      "label_town",
      "label_village",
      "label_other",
      "water_name_point_label",
      "water_name_line_label",
    ];
    for (const layer of labelLayers) {
      map.setPaintProperty(layer, "text-color", textColor);
      map.setPaintProperty(layer, "text-halo-color", bg);
    }
  }

  applyColorScheme(colorSchemeQuery.matches);
  colorSchemeQuery.addEventListener("change", (e) =>
    applyColorScheme(e.matches),
  );

  map.setPaintProperty("boundary_2", "line-color", BORDER_COLOR);

  // Add visited countries layer
  map.addLayer(
    {
      id: "visited-countries",
      type: "fill",
      source: "countries",
      "source-layer": "countries",
      paint: {
        "fill-color": VISITED_COLOR,
        "fill-opacity": 0.6,
      },
      filter: ["in", ["get", "ADM0_A3"], ["literal", Array.from(countries)]],
    },
    "boundary_2",
  );

  // Add visited cities source
  const cityFeatures = Array.from(cities)
    .filter((city) => cityCoordinates[city])
    .map((city) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: cityCoordinates[city],
      },
      properties: { name: city },
    }));

  map.addSource("visited-cities", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: cityFeatures,
    },
  });

  // Add visited cities layer with blur effect (before labels)
  map.addLayer(
    {
      id: "visited-cities",
      type: "circle",
      source: "visited-cities",
      paint: {
        "circle-color": CITY_COLOR,
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          1,
          3,
          3,
          8,
          5,
          20,
          8,
          50,
        ],
        "circle-blur": 1,
        "circle-opacity": 0.5,
      },
    },
    "label_other",
  );

  // Hide placeholder when map is fully rendered
  map.once("idle", () => {
    const placeholder = document.getElementById("placeholder");
    if (placeholder) placeholder.style.opacity = "0";
  });

  // Function to fly to a city
  function flyToCity(cityName: string): void {
    if (cityCoordinates[cityName]) {
      map.flyTo({
        center: cityCoordinates[cityName] as [number, number],
        zoom: 6,
        duration: 1000,
      });
    }
  }

  // Expose flyToCity globally for external use
  (window as unknown as { flyToCity: typeof flyToCity }).flyToCity = flyToCity;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMap);
} else {
  initMap();
}
