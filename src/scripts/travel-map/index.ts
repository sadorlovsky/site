import { Map, Marker } from "maplibre-gl";
import {
  countriesFillLayer,
  crimeaFillLayer,
  getBackgroundLayer,
} from "./layers";

// Wait for DOM to be fully ready
function initializeMap() {
  let zoom = document.body.clientWidth <= 480 ? 1 : 2;

  const mapContainer = document.getElementById("map");
  if (!mapContainer) {
    console.error("Map container not found, retrying...");
    setTimeout(initializeMap, 100);
    return;
  }

  const map = new Map({
    container: "map",
    style: "/maptiles.json",
    center: [43, 55],
    zoom,
    attributionControl: false,
  });

  return map;
}

const map = initializeMap();
if (!map) {
  throw new Error("Failed to initialize map");
}

// Track visible labels and their coordinates for mobile interaction
let visibleLabels = new globalThis.Map<HTMLElement, [number, number]>();

// Flag to prevent map click interference with marker clicks
let preventMapClick = false;

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

map.on("load", async () => {
  map.addLayer(getBackgroundLayer(colorScheme) as any, "coastline");
  map.addLayer(countriesFillLayer as any, "countries-boundary");
  map.addLayer(crimeaFillLayer as any);

  // iOS Safari fix: Force resize after layers are added
  setTimeout(() => {
    map.resize();
  }, 100);

  // Additional delay for iOS Safari
  setTimeout(() => {
    map.resize();
  }, 500);

  // Load and display cities
  await loadCities();
});

async function loadCities() {
  try {
    // Show loading state
    console.log("Loading cities and trips data...");

    // Load both cities and trips data
    const [citiesResponse, tripsResponse] = await Promise.all([
      fetch("/cities.geojson"),
      fetch("/trips.json"),
    ]);

    if (!citiesResponse.ok || !tripsResponse.ok) {
      throw new Error(
        `HTTP error! Cities: ${citiesResponse.status}, Trips: ${tripsResponse.status}`,
      );
    }

    const citiesData = await citiesResponse.json();
    const tripsData = await tripsResponse.json();

    if (!citiesData?.features || !Array.isArray(citiesData.features)) {
      throw new Error("Invalid GeoJSON format");
    }

    if (!Array.isArray(tripsData)) {
      throw new Error("Invalid trips data format");
    }

    // Get visited cities from trips data (where date !== "TBA")
    const visitedCityNames = new Set<string>();
    tripsData.forEach((trip: any) => {
      if (trip.date !== "TBA") {
        trip.destination?.forEach((dest: any) => {
          // Split city names that contain commas
          const cities = dest.city.split(",").map((c: string) => c.trim());
          cities.forEach((cityName: string) => {
            // Normalize city names for better matching
            const normalizedName = cityName
              .toLowerCase()
              .replace(/\s+/g, " ")
              .trim();
            visitedCityNames.add(normalizedName);
            console.log(`Added visited city: "${normalizedName}"`);

            // Also add variations for common naming differences
            if (normalizedName.includes("saint ")) {
              visitedCityNames.add(normalizedName.replace("saint ", "st. "));
            }
            if (normalizedName.includes("st. ")) {
              visitedCityNames.add(normalizedName.replace("st. ", "saint "));
            }
          });
        });
      }
    });

    let visitedCount = 0;
    const cityLabels: Array<{
      element: HTMLElement;
      coordinates: [number, number];
    }> = [];
    const cityMarkers: Array<any> = [];

    citiesData.features.forEach((city: any) => {
      if (!city.geometry?.coordinates || !city.properties) {
        console.warn("Skipping invalid city data:", city);
        return;
      }

      const coordinates = city.geometry.coordinates;
      const cityName = city.properties.name
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

      // Check if city is visited by looking in trips data with multiple variations
      let isVisited = visitedCityNames.has(cityName);

      // Try variations if not found
      if (!isVisited) {
        if (cityName.includes("saint ")) {
          isVisited = visitedCityNames.has(cityName.replace("saint ", "st. "));
        }
        if (cityName.includes("st. ")) {
          isVisited = visitedCityNames.has(cityName.replace("st. ", "saint "));
        }
        // Handle common variations
        if (cityName === "dehli") {
          isVisited = visitedCityNames.has("delhi");
        }
        if (cityName === "delhi") {
          isVisited = visitedCityNames.has("dehli");
        }
      }

      // Only show visited cities
      if (!isVisited) {
        console.log(`City not visited, skipping: "${cityName}"`);
        return;
      }

      console.log(`Displaying visited city: "${cityName}"`);

      visitedCount++;

      // Create marker element (just the dot)
      const markerElement = document.createElement("div");
      markerElement.className = "city-marker visited";
      markerElement.innerHTML = `<div class="city-dot"></div>`;

      // Create label element separately
      const labelElement = document.createElement("div");
      labelElement.className = "city-label-overlay";
      labelElement.textContent = city.properties.name;
      labelElement.style.display = "none";

      // Store reference to label with coordinates
      cityLabels.push({ element: labelElement, coordinates });

      // Add hover events to show/hide label (desktop)
      markerElement.addEventListener("mouseenter", () => {
        showCityLabel(labelElement, coordinates);
      });

      markerElement.addEventListener("mouseleave", () => {
        hideCityLabel(labelElement);
      });

      // Add touch/click handlers for mobile
      const handleMarkerInteraction = (e: Event) => {
        e.stopPropagation();
        e.preventDefault();

        preventMapClick = true;

        // Check if this label is already visible
        if (visibleLabels.has(labelElement)) {
          hideCityLabel(labelElement);
        } else {
          // Hide all other labels first (single label at a time)
          visibleLabels.forEach(
            (coords: [number, number], label: HTMLElement) => {
              hideCityLabel(label);
            },
          );
          showCityLabel(labelElement, coordinates);
        }

        // Reset flag after event processing
        setTimeout(() => {
          preventMapClick = false;
        }, 50);
      };

      // Add both touch and click events for better mobile support
      markerElement.addEventListener("touchstart", handleMarkerInteraction, {
        passive: false,
      });
      markerElement.addEventListener("click", handleMarkerInteraction);

      // Create marker but don't add to map yet (hidden by default)
      const marker = new Marker({ element: markerElement }).setLngLat(
        coordinates,
      );
      cityMarkers.push(marker);
    });

    // Add all labels to the map container
    const mapContainer = document.getElementById("map");
    cityLabels.forEach(({ element }) => {
      mapContainer?.appendChild(element);
    });

    // Add map click handler to hide labels when clicking elsewhere
    if (map) {
      map.on("click", () => {
        // Don't hide labels if a marker interaction just occurred
        if (preventMapClick) {
          return;
        }

        // Hide all visible labels
        visibleLabels.forEach(
          (coords: [number, number], label: HTMLElement) => {
            hideCityLabel(label);
          },
        );
      });

      // Add map move handler to update label positions
      map.on("move", updateVisibleLabels);
    }

    // Set up toggle functionality
    setupCitiesToggle(cityMarkers, cityLabels);

    console.log(
      `Loaded ${visitedCount} visited cities from ${tripsData.length} trips`,
    );
  } catch (error) {
    console.error("Failed to load cities:", error);
    // Show user-friendly error message
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(239, 68, 68, 0.9);
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      font-size: 14px;
      z-index: 1001;
    `;
    errorDiv.textContent = "Failed to load travel cities data";
    document.getElementById("map")?.appendChild(errorDiv);

    // Remove error message after 5 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }
}

function showCityLabel(
  labelElement: HTMLElement,
  coordinates: [number, number],
) {
  const mapContainer = document.getElementById("map");
  if (!mapContainer) return;

  // Add to visible labels tracking
  visibleLabels.set(labelElement, coordinates);

  // Convert geographic coordinates to screen coordinates
  updateLabelPosition(labelElement, coordinates);
  labelElement.style.display = "block";
}

function hideCityLabel(labelElement: HTMLElement) {
  labelElement.style.display = "none";
  // Remove from visible labels tracking
  visibleLabels.delete(labelElement);
}

// Update a single label position
function updateLabelPosition(
  labelElement: HTMLElement,
  coordinates: [number, number],
) {
  if (!map) return;
  const screenCoords = map.project(coordinates);
  labelElement.style.left = `${screenCoords.x}px`;
  labelElement.style.top = `${screenCoords.y - 35}px`;
}

// Update all visible labels during map movement
function updateVisibleLabels() {
  visibleLabels.forEach(
    (coordinates: [number, number], labelElement: HTMLElement) => {
      updateLabelPosition(labelElement, coordinates);
    },
  );
}

function setupCitiesToggle(
  markers: Array<any>,
  labels: Array<{ element: HTMLElement; coordinates: [number, number] }>,
) {
  const toggle = document.getElementById("citiesToggle") as HTMLInputElement;
  if (!toggle) return;

  const STORAGE_KEY = "travel-map-cities-visible";

  // Get initial state from localStorage (default to false)
  const savedState = localStorage.getItem(STORAGE_KEY);
  const initialState = savedState === "true";
  toggle.checked = initialState;

  // Apply initial state
  if (initialState) {
    // Show markers
    markers.forEach((marker) => marker.addTo(map));
  } else {
    // Hide markers and labels
    markers.forEach((marker) => marker.remove());
    labels.forEach(({ element }) => {
      element.style.display = "none";
    });
  }

  toggle.addEventListener("change", () => {
    // Save state to localStorage
    localStorage.setItem(STORAGE_KEY, toggle.checked.toString());

    if (toggle.checked) {
      // Show markers
      markers.forEach((marker) => marker.addTo(map));
    } else {
      // Hide markers and labels
      markers.forEach((marker) => marker.remove());
      labels.forEach(({ element }) => {
        element.style.display = "none";
      });
    }
  });
}

map.on("sourcedata", (event) => {
  if (event.sourceId === "maplibre" && event.isSourceLoaded) {
    const placeholder = document.querySelector(
      "#placeholder",
    ) as HTMLDivElement;
    placeholder.style.opacity = "0";

    // iOS Safari fix: Additional resize after tiles load
    setTimeout(() => {
      map.resize();
    }, 50);
  }
});

// iOS Safari specific fixes
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
  // Fix for iOS Safari viewport changes
  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      map.resize();
    }, 200);
  });

  // Fix for iOS Safari page visibility changes
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      setTimeout(() => {
        map.resize();
      }, 100);
    }
  });

  // Fix for iOS Safari focus/blur events
  window.addEventListener("pageshow", () => {
    setTimeout(() => {
      map.resize();
    }, 100);
  });
}
