import { Map as MapLibre, Marker } from "maplibre-gl";
import { countries } from "@lib/travel";

// Types
interface CityFeature {
  geometry: { coordinates: [number, number] };
  properties: { name: string; code: string; country: string };
}

interface LabelData {
  element: HTMLElement;
  coordinates: [number, number];
}

type LabelsMap = globalThis.Map<HTMLElement, LabelData>;

// Configuration
const CONFIG = {
  MOBILE_BREAKPOINT: 480,
  ZOOM: { mobile: 1, desktop: 2 },
  LABEL_OFFSET: 35,
  STORAGE_KEY: "travel-map-cities-visible",
} as const;

// Color scheme detection
const getColorScheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

// Initialize map
async function initMap(): Promise<void> {
  const container = document.getElementById("map");
  if (!container) return;

  const isMobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
  let colorScheme = getColorScheme();

  // Create map
  const map = new MapLibre({
    container: "map",
    style: "/maptiles.json",
    center: [43, 55],
    zoom: isMobile ? CONFIG.ZOOM.mobile : CONFIG.ZOOM.desktop,
    attributionControl: false,
  });

  // Wait for map to load
  await new Promise<void>((resolve) => map.on("load", resolve));

  // Add layers
  addLayers(map, colorScheme);

  // Hide placeholder
  const placeholder = document.getElementById("placeholder");
  if (placeholder) placeholder.style.opacity = "0";

  // Load cities and create markers
  const { markers, labels } = await loadAndCreateMarkers(map);

  // Setup toggle
  setupToggle(map, markers, labels);

  // Setup label interactions
  setupMapInteractions(map, labels);

  // Listen for color scheme changes
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      colorScheme = e.matches ? "dark" : "light";
      updateBackgroundLayer(map, colorScheme);
    });
}

// Add map layers
function addLayers(map: MapLibre, colorScheme: string): void {
  // Background layer
  map.addLayer(
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": colorScheme === "dark" ? "#222222" : "#ebedf0",
      },
    },
    "coastline",
  );

  // Countries fill layer
  map.addLayer(
    {
      id: "countries-fill",
      type: "fill",
      source: "maplibre",
      "source-layer": "countries",
      paint: {
        "fill-color": [
          "match",
          ["get", "ADM0_A3"],
          Array.from(countries),
          "#f7b267",
          "#B1BBF9",
        ],
      },
    },
    "countries-boundary",
  );

  // Crimea fill (unvisited)
  map.addLayer({
    id: "crimea-fill",
    type: "fill",
    source: "crimea",
    paint: { "fill-color": "#B1BBF9" },
  });

  // Country boundaries
  map.addLayer({
    id: "admin-boundaries",
    type: "line",
    source: "maplibre",
    "source-layer": "ne_10m_admin_0_boundary_lines_land",
    paint: {
      "line-color": "#808080",
      "line-width": 0.5,
    },
  });
}

// Update background layer on color scheme change
function updateBackgroundLayer(map: MapLibre, colorScheme: string): void {
  if (map.getLayer("background")) {
    map.removeLayer("background");
  }
  map.addLayer(
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": colorScheme === "dark" ? "#222222" : "#ebedf0",
      },
    },
    "coastline",
  );
}

// Load cities data and create markers
async function loadAndCreateMarkers(map: MapLibre): Promise<{
  markers: Marker[];
  labels: LabelsMap;
}> {
  // Fetch cities GeoJSON
  const response = await fetch("/cities.geojson");
  const geojson = await response.json();

  // Get visited cities from trips
  const tripsResponse = await fetch("/trips.json");
  const trips = await tripsResponse.json();

  const visitedCities = new Set<string>();
  trips.forEach((trip: any) => {
    trip.destinations?.forEach((dest: any) => {
      dest.cities?.forEach((city: string) => {
        visitedCities.add(city.toLowerCase().trim());
        // Add St./Saint variations
        const lower = city.toLowerCase().trim();
        if (lower.includes("saint ")) {
          visitedCities.add(lower.replace("saint ", "st. "));
        }
        if (lower.includes("st. ")) {
          visitedCities.add(lower.replace("st. ", "saint "));
        }
      });
    });
  });

  const markers: Marker[] = [];
  const labels: LabelsMap = new globalThis.Map();
  const mapContainer = document.getElementById("map")!;

  // Create markers for visited cities
  geojson.features.forEach((city: CityFeature) => {
    const cityName = city.properties.name.toLowerCase().trim();

    // Check if visited
    if (!visitedCities.has(cityName)) {
      // Try variations
      const stVariation = cityName.includes("saint ")
        ? cityName.replace("saint ", "st. ")
        : cityName.includes("st. ")
          ? cityName.replace("st. ", "saint ")
          : null;

      if (!stVariation || !visitedCities.has(stVariation)) {
        return;
      }
    }

    const coords = city.geometry.coordinates;

    // Create marker element
    const markerEl = document.createElement("div");
    markerEl.className = "city-marker visited";
    markerEl.innerHTML = '<div class="city-dot"></div>';

    // Create label element
    const labelEl = document.createElement("div");
    labelEl.className = "city-label-overlay";
    labelEl.innerHTML = `
      <div class="city-label-flag">
        <span class="fi fi-${city.properties.code} flag-fix"></span>
      </div>
      <span>${city.properties.name}, ${city.properties.country}</span>
    `;
    labelEl.style.display = "none";
    mapContainer.appendChild(labelEl);

    // Create marker
    const marker = new Marker({ element: markerEl }).setLngLat(coords);
    markers.push(marker);
    labels.set(markerEl, { element: labelEl, coordinates: coords });

    // Marker interactions
    markerEl.addEventListener("mouseenter", () =>
      showLabel(map, labelEl, coords),
    );
    markerEl.addEventListener("mouseleave", () => hideLabel(labelEl));
    markerEl.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleLabel(map, labelEl, coords, labels);
    });
  });

  return { markers, labels };
}

// Show label at coordinates
function showLabel(
  map: MapLibre,
  labelEl: HTMLElement,
  coords: [number, number],
): void {
  const point = map.project(coords);
  labelEl.style.transform = `translate(${point.x}px, ${point.y - CONFIG.LABEL_OFFSET}px)`;
  labelEl.style.display = "";
}

// Hide label
function hideLabel(labelEl: HTMLElement): void {
  labelEl.style.display = "none";
}

// Toggle label (for mobile)
function toggleLabel(
  map: MapLibre,
  labelEl: HTMLElement,
  coords: [number, number],
  allLabels: LabelsMap,
): void {
  const isVisible = labelEl.style.display !== "none";

  // Hide all labels first
  allLabels.forEach(({ element }) => hideLabel(element));

  // Show this one if it was hidden
  if (!isVisible) {
    showLabel(map, labelEl, coords);
  }
}

// Setup toggle button
function setupToggle(
  map: MapLibre,
  markers: Marker[],
  labels: LabelsMap,
): void {
  const toggle = document.getElementById("citiesToggle") as HTMLInputElement;
  if (!toggle) return;

  // Restore saved state
  const savedState = localStorage.getItem(CONFIG.STORAGE_KEY) === "true";
  toggle.checked = savedState;

  // Apply initial state
  applyToggleState(map, markers, labels, savedState);

  // Listen for changes
  toggle.addEventListener("change", () => {
    const visible = toggle.checked;
    applyToggleState(map, markers, labels, visible);
    localStorage.setItem(CONFIG.STORAGE_KEY, String(visible));
  });
}

// Apply toggle state
function applyToggleState(
  map: MapLibre,
  markers: Marker[],
  labels: LabelsMap,
  visible: boolean,
): void {
  markers.forEach((marker) => {
    if (visible) {
      marker.addTo(map);
    } else {
      marker.remove();
    }
  });

  // Hide all labels when toggling off
  if (!visible) {
    labels.forEach(({ element }) => hideLabel(element));
  }
}

// Setup map interactions
function setupMapInteractions(map: MapLibre, labels: LabelsMap): void {
  // Hide labels on map click
  map.on("click", () => {
    labels.forEach(({ element }) => hideLabel(element));
  });

  // Update label positions on map move
  let frameId: number;
  map.on("move", () => {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(() => {
      labels.forEach(({ element, coordinates }) => {
        if (element.style.display !== "none") {
          const point = map.project(coordinates);
          element.style.transform = `translate(${point.x}px, ${point.y - CONFIG.LABEL_OFFSET}px)`;
        }
      });
    });
  });
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMap);
} else {
  initMap();
}
