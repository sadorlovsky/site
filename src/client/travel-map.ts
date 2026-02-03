import { Map as MapLibre } from "maplibre-gl";
import { countries, cities, cityCoordinates } from "@lib/travel";
import { getCityName } from "@lib/travel/cities-i18n";
import crimeaGeoJson from "@lib/travel/crimea.geo.json";

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
const GLOBE_PADDING_DESKTOP = 50;
const GLOBE_PADDING_MOBILE = 0;

function getGlobePadding(containerWidth: number): number {
  return containerWidth <= MOBILE_BREAKPOINT
    ? GLOBE_PADDING_MOBILE
    : GLOBE_PADDING_DESKTOP;
}

// Calculate zoom level to fit globe in container
// MapLibre globe visual size ≈ 512 * 2^zoom / 2.7 (empirically determined)
// So: visualDiameter = 512 * 2^zoom / 2.7
// Solving for zoom: zoom = log2(visualDiameter * 2.7 / 512)
const GLOBE_SCALE_FACTOR = 2.7;

function getZoomForGlobe(
  containerWidth: number,
  containerHeight: number,
  padding: number,
): number {
  const targetDiameter = Math.min(
    containerWidth,
    containerHeight - padding * 2,
  );
  return Math.log2((targetDiameter * GLOBE_SCALE_FACTOR) / 512);
}

async function initMap(): Promise<void> {
  const container = document.getElementById("map");
  if (!container) return;

  const mode = (container.dataset.mode || "normal") as "normal" | "globe";
  const isGlobe = mode === "globe";
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

  // For globe mode, calculate zoom to fit globe in container with padding
  const getInitialZoom = (): number => {
    if (isGlobe) {
      const padding = getGlobePadding(container.clientWidth);
      return getZoomForGlobe(
        container.clientWidth,
        container.clientHeight,
        padding,
      );
    }
    return isMobile ? 1 : 2;
  };

  // For globe mode, start further west so rotation immediately shows Western Europe
  const initialCenter: [number, number] = isGlobe ? [-10, 50] : [43, 55];

  const initialZoom = getInitialZoom();

  const map = new MapLibre({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/positron",
    center: initialCenter,
    zoom: initialZoom,
    minZoom: isGlobe ? initialZoom : 1,
    attributionControl: false,
  });

  await new Promise<void>((resolve) => map.on("load", resolve));

  // Mode toggle functionality (exposed globally for future use)
  let currentMode: "globe" | "normal" = isGlobe ? "globe" : "normal";

  function setProjectionMode(mode: "globe" | "normal") {
    currentMode = mode;
    if (mode === "globe") {
      map.setProjection({ type: "globe" });
      const padding = getGlobePadding(container.clientWidth);
      const newZoom = getZoomForGlobe(
        container.clientWidth,
        container.clientHeight,
        padding,
      );
      map.setMinZoom(newZoom);
      map.setZoom(newZoom);
    } else {
      map.setProjection({ type: "mercator" });
      map.setMinZoom(1);
      map.setZoom(isMobile ? 1 : 2);
    }
  }

  // Expose for external use: window.setMapMode("globe") or window.setMapMode("normal")
  (window as unknown as { setMapMode: typeof setProjectionMode }).setMapMode =
    setProjectionMode;

  if (isGlobe) {
    map.setProjection({ type: "globe" });

    // Recalculate zoom on container resize
    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width === 0 || height === 0) return;
      const padding = getGlobePadding(width);
      const newZoom = getZoomForGlobe(width, height, padding);
      map.setMinZoom(newZoom);
      map.setZoom(newZoom);
    });
    resizeObserver.observe(container);

    // Auto-rotation for globe mode
    let isRotating = true;
    const rotationSpeed = 0.15; // degrees per frame

    function rotate() {
      if (!isRotating) return;
      const center = map.getCenter();
      center.lng += rotationSpeed;
      map.setCenter(center);
      requestAnimationFrame(rotate);
    }

    // Start rotation
    rotate();

    // Stop rotation on user interaction
    const stopRotation = () => {
      isRotating = false;
    };

    map.on("mousedown", stopRotation);
    map.on("touchstart", stopRotation);
    map.on("wheel", stopRotation);
    map.on("dragstart", stopRotation);
  }

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

    const textColor = isDark ? DARK_TEXT : LIGHT_TEXT;
    for (const layer of labelLayers) {
      map.setLayoutProperty(layer, "visibility", "visible");
      map.setPaintProperty(layer, "text-color", textColor);
      map.setPaintProperty(layer, "text-halo-color", bg);
    }

    if (isGlobe) {
      // Hide all labels in globe mode
      for (const layer of labelLayers) {
        map.setLayoutProperty(layer, "visibility", "none");
      }
    }
  }

  applyColorScheme(colorSchemeQuery.matches);
  colorSchemeQuery.addEventListener("change", (e) =>
    applyColorScheme(e.matches),
  );

  // // Fade in country labels at higher zoom levels
  // const countryLabelLayers = [
  //   "label_country_1",
  //   "label_country_2",
  //   "label_country_3",
  // ];
  // for (const layer of countryLabelLayers) {
  //   map.setPaintProperty(layer, "text-opacity", [
  //     "interpolate",
  //     ["linear"],
  //     ["zoom"],
  //     3,
  //     0,
  //     5,
  //     1,
  //   ]);
  // }

  // // Fade in water labels at higher zoom levels
  // const waterLabelLayers = ["water_name_point_label", "water_name_line_label"];
  // for (const layer of waterLabelLayers) {
  //   map.setPaintProperty(layer, "text-opacity", [
  //     "interpolate",
  //     ["linear"],
  //     ["zoom"],
  //     3,
  //     0,
  //     5,
  //     1,
  //   ]);
  // }

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

  // Add Crimea exclusion layer (to hide it from visited countries)
  map.addSource("crimea", {
    type: "geojson",
    data: crimeaGeoJson as GeoJSON.Feature,
  });

  const isDark = colorSchemeQuery.matches;
  map.addLayer(
    {
      id: "crimea-mask",
      type: "fill",
      source: "crimea",
      paint: {
        "fill-color": isDark ? DARK_BG : LIGHT_BG,
        "fill-opacity": 1,
      },
    },
    "boundary_2",
  );

  // Update crimea mask on color scheme change
  colorSchemeQuery.addEventListener("change", (e) => {
    map.setPaintProperty(
      "crimea-mask",
      "fill-color",
      e.matches ? DARK_BG : LIGHT_BG,
    );
  });

  // Add visited cities source (with numeric ids for feature-state)
  const cityFeatures = Array.from(cities)
    .filter((city) => cityCoordinates[city])
    .map((city, i) => ({
      type: "Feature" as const,
      id: i,
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

  // Add visited cities layer with feature-state driven hover
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
          ["case", ["boolean", ["feature-state", "hover"], false], 5, 3],
          3,
          ["case", ["boolean", ["feature-state", "hover"], false], 8, 5],
          5,
          ["case", ["boolean", ["feature-state", "hover"], false], 12, 8],
          8,
          ["case", ["boolean", ["feature-state", "hover"], false], 12, 8],
        ],
        "circle-radius-transition": { duration: 150 },
        "circle-blur": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.15,
          0.25,
        ],
        "circle-blur-transition": { duration: 150 },
        "circle-opacity": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.9,
          0.45,
        ],
        "circle-opacity-transition": { duration: 150 },
      },
    },
    "label_other",
  );

  // City hover: track hovered feature and show label tooltip
  const cityLabel = document.createElement("div");
  cityLabel.className = "city-label-overlay";
  cityLabel.style.display = "none";
  container.appendChild(cityLabel);

  let hoveredCityId: number | null = null;

  // Find the closest city feature to a screen point
  function getClosestCity(point: { x: number; y: number }) {
    const pad = 14;
    const bbox: [{ x: number; y: number }, { x: number; y: number }] = [
      { x: point.x - pad, y: point.y - pad },
      { x: point.x + pad, y: point.y + pad },
    ];
    const features = map.queryRenderedFeatures(bbox, {
      layers: ["visited-cities"],
    });
    if (features.length === 0) return null;

    // Find closest to cursor
    let closest = features[0];
    let minDist = Infinity;
    for (const f of features) {
      const projected = map.project(
        (f.geometry as GeoJSON.Point).coordinates as [number, number],
      );
      const dx = projected.x - point.x;
      const dy = projected.y - point.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closest = f;
      }
    }
    return closest;
  }

  map.on("mousemove", (e) => {
    const feature = getClosestCity(e.point);

    if (feature) {
      const newId = feature.id as number;

      if (hoveredCityId !== null && hoveredCityId !== newId) {
        map.setFeatureState(
          { source: "visited-cities", id: hoveredCityId },
          { hover: false },
        );
      }

      if (hoveredCityId !== newId) {
        hoveredCityId = newId;
        map.setFeatureState(
          { source: "visited-cities", id: newId },
          { hover: true },
        );
        const lang = (localStorage.getItem("lang") as "en" | "ru") || "en";
        cityLabel.textContent = getCityName(feature.properties!.name, lang);
      }

      map.getCanvas().style.cursor = "pointer";
      cityLabel.style.display = "flex";
      cityLabel.style.left = `${e.point.x}px`;
      cityLabel.style.top = `${e.point.y - 30}px`;
    } else if (hoveredCityId !== null) {
      map.setFeatureState(
        { source: "visited-cities", id: hoveredCityId },
        { hover: false },
      );
      hoveredCityId = null;
      map.getCanvas().style.cursor = "";
      cityLabel.style.display = "none";
    }
  });

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
