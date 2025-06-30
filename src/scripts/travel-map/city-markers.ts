import { Marker } from "maplibre-gl";
import type {
  CityFeature,
  CityLabelData,
  MarkerInteractionHandler,
  MapConfig,
} from "./types";

export class CityMarkerManager {
  private markers: Marker[] = [];
  private labelData: CityLabelData[] = [];
  private map: any;
  private config: MapConfig;
  private onLabelShow: (
    element: HTMLElement,
    coordinates: [number, number],
  ) => void;
  private onLabelHide: (element: HTMLElement) => void;
  private preventMapClick: () => void;

  constructor(
    map: any,
    config: MapConfig,
    onLabelShow: (element: HTMLElement, coordinates: [number, number]) => void,
    onLabelHide: (element: HTMLElement) => void,
    preventMapClick: () => void,
  ) {
    this.map = map;
    this.config = config;
    this.onLabelShow = onLabelShow;
    this.onLabelHide = onLabelHide;
    this.preventMapClick = preventMapClick;
  }

  /**
   * Creates markers for visited cities
   */
  createMarkersFromCities(
    cities: CityFeature[],
    visitedCityNames: Set<string>,
  ): { markers: Marker[]; labels: CityLabelData[] } {
    let visitedCount = 0;
    this.markers = [];
    this.labelData = [];

    cities.forEach((city: CityFeature) => {
      if (!city.geometry?.coordinates || !city.properties) {
        console.warn("Skipping invalid city data:", city);
        return;
      }

      const coordinates = city.geometry.coordinates;
      const cityName = city.properties.name
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

      // Check if city is visited
      if (!this.isCityVisited(cityName, visitedCityNames)) {
        console.log(`City not visited, skipping: "${cityName}"`);
        return;
      }

      console.log(`Displaying visited city: "${cityName}"`);
      visitedCount++;

      const { marker, labelElement } = this.createSingleMarker(
        city,
        coordinates,
      );

      this.markers.push(marker);
      this.labelData.push({ element: labelElement, coordinates });
    });

    console.log(`Created ${visitedCount} city markers`);
    return { markers: this.markers, labels: this.labelData };
  }

  /**
   * Creates a single marker with its label and interactions
   */
  private createSingleMarker(
    city: CityFeature,
    coordinates: [number, number],
  ): { marker: Marker; labelElement: HTMLElement } {
    // Create marker element (the dot)
    const markerElement = document.createElement("div");
    markerElement.className = "city-marker visited";
    markerElement.innerHTML = `<div class="city-dot"></div>`;

    // Create label element
    const labelElement = document.createElement("div");
    labelElement.className = "city-label-overlay";
    labelElement.textContent = city.properties.name;
    labelElement.style.display = "none";

    // Add interaction handlers
    this.setupMarkerInteractions(markerElement, labelElement, coordinates);

    // Create MapLibre marker
    const marker = new Marker({ element: markerElement }).setLngLat(
      coordinates,
    );

    return { marker, labelElement };
  }

  /**
   * Sets up hover and touch/click interactions for a marker
   */
  private setupMarkerInteractions(
    markerElement: HTMLElement,
    labelElement: HTMLElement,
    coordinates: [number, number],
  ): void {
    // Desktop hover events
    markerElement.addEventListener("mouseenter", () => {
      this.onLabelShow(labelElement, coordinates);
    });

    markerElement.addEventListener("mouseleave", () => {
      this.onLabelHide(labelElement);
    });

    // Mobile touch/click handler
    const handleMarkerInteraction: MarkerInteractionHandler = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();

      this.preventMapClick();

      // Toggle label visibility
      this.toggleMarkerLabel(labelElement, coordinates);

      // Reset prevent flag after processing
      setTimeout(() => {
        // Flag will be reset by the calling code
      }, this.config.TIMEOUTS.PREVENT_CLICK);
    };

    // Add both touch and click events for mobile support
    markerElement.addEventListener("touchstart", handleMarkerInteraction, {
      passive: false,
    });
    markerElement.addEventListener("click", handleMarkerInteraction);
  }

  /**
   * Toggles a marker's label visibility
   */
  private toggleMarkerLabel(
    labelElement: HTMLElement,
    coordinates: [number, number],
  ): void {
    // This will be handled by the label manager
    // For now, we call the provided callbacks
    const isVisible = labelElement.style.display !== "none";

    if (isVisible) {
      this.onLabelHide(labelElement);
    } else {
      // Hide all other labels first (single label at a time)
      this.hideAllLabels();
      this.onLabelShow(labelElement, coordinates);
    }
  }

  /**
   * Hides all currently visible labels
   */
  private hideAllLabels(): void {
    this.labelData.forEach(({ element }) => {
      this.onLabelHide(element);
    });
  }

  /**
   * Checks if a city is in the visited set, including common variations
   */
  private isCityVisited(
    cityName: string,
    visitedCityNames: Set<string>,
  ): boolean {
    // Direct match
    if (visitedCityNames.has(cityName)) {
      return true;
    }

    // Try variations
    if (cityName.includes("saint ")) {
      if (visitedCityNames.has(cityName.replace("saint ", "st. "))) {
        return true;
      }
    }
    if (cityName.includes("st. ")) {
      if (visitedCityNames.has(cityName.replace("st. ", "saint "))) {
        return true;
      }
    }

    // Handle common variations
    if (cityName === "dehli" && visitedCityNames.has("delhi")) {
      return true;
    }
    if (cityName === "delhi" && visitedCityNames.has("dehli")) {
      return true;
    }

    return false;
  }

  /**
   * Shows all markers on the map
   */
  showMarkers(): void {
    this.markers.forEach((marker) => {
      if (this.map) {
        marker.addTo(this.map);
      }
    });
  }

  /**
   * Hides all markers from the map
   */
  hideMarkers(): void {
    this.markers.forEach((marker) => marker.remove());
    this.hideAllLabels();
  }

  /**
   * Gets all markers
   */
  getMarkers(): Marker[] {
    return this.markers;
  }

  /**
   * Gets all label data
   */
  getLabelData(): CityLabelData[] {
    return this.labelData;
  }

  /**
   * Adds all labels to the map container
   */
  addLabelsToContainer(): void {
    const mapContainer = document.getElementById("map");
    if (mapContainer) {
      this.labelData.forEach(({ element }) => {
        mapContainer.appendChild(element);
      });
    }
  }
}
