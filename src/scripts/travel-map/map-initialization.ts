import { Map } from "maplibre-gl";
import {
  countriesFillLayer,
  crimeaFillLayer,
  getBackgroundLayer,
} from "./layers";
import type { ColorScheme, MapConfig } from "./types";

export class MapInitializer {
  private map: Map | null = null;
  private config: MapConfig;
  private colorScheme: ColorScheme;
  private retryCount = 0;
  private maxRetries = 5;

  constructor(config: MapConfig) {
    this.config = config;
    this.colorScheme = this.detectColorScheme();
    this.setupColorSchemeListener();
  }

  /**
   * Initializes the map with retry logic
   */
  async initializeMap(): Promise<Map> {
    return new Promise((resolve, reject) => {
      const attemptInitialization = () => {
        const zoom = this.getInitialZoom();
        const mapContainer = document.getElementById("map");

        if (!mapContainer) {
          if (this.retryCount < this.maxRetries) {
            console.warn(
              `Map container not found, retrying... (${this.retryCount + 1}/${this.maxRetries})`
            );
            this.retryCount++;
            setTimeout(attemptInitialization, this.config.TIMEOUTS.MAP_RESIZE);
            return;
          } else {
            reject(new Error("Map container not found after maximum retries"));
            return;
          }
        }

        try {
          this.map = new Map({
            container: "map",
            style: "/maptiles.json",
            center: [43, 55],
            zoom,
            attributionControl: false,
          });

          this.setupMapEventHandlers();
          resolve(this.map);
        } catch (error) {
          reject(new Error(`Failed to initialize map: ${error}`));
        }
      };

      attemptInitialization();
    });
  }

  /**
   * Sets up map event handlers for loading and iOS fixes
   */
  private setupMapEventHandlers(): void {
    if (!this.map) return;

    this.map.on("load", () => {
      this.addLayers();
      this.applyIOSSafariFixesOnLoad();
    });

    this.map.on("sourcedata", (event) => {
      if (event.sourceId === "maplibre" && event.isSourceLoaded) {
        this.hidePlaceholder();
        this.applyIOSSafariFixesOnSourceLoad();
      }
    });

    this.setupIOSSafariEventHandlers();
  }

  /**
   * Adds all map layers
   */
  private addLayers(): void {
    if (!this.map) return;

    try {
      this.map.addLayer(
        getBackgroundLayer(this.colorScheme) as any,
        "coastline"
      );
      this.map.addLayer(countriesFillLayer as any, "countries-boundary");
      this.map.addLayer(crimeaFillLayer as any);
    } catch (error) {
      console.error("Failed to add map layers:", error);
    }
  }

  /**
   * Detects the user's color scheme preference
   */
  private detectColorScheme(): ColorScheme {
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  /**
   * Sets up color scheme change listener
   */
  private setupColorSchemeListener(): void {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (event) => {
        this.colorScheme = event.matches ? "dark" : "light";
        this.updateBackgroundLayer();
      });
  }

  /**
   * Updates the background layer when color scheme changes
   */
  private updateBackgroundLayer(): void {
    if (!this.map) return;

    try {
      if (this.map.getLayer("background")) {
        this.map.removeLayer("background");
      }
      this.map.addLayer(
        getBackgroundLayer(this.colorScheme) as any,
        "coastline"
      );
    } catch (error) {
      console.error("Failed to update background layer:", error);
    }
  }

  /**
   * Gets initial zoom level based on screen size
   */
  private getInitialZoom(): number {
    return document.body.clientWidth <= this.config.MOBILE_BREAKPOINT
      ? this.config.ZOOM_LEVELS.mobile
      : this.config.ZOOM_LEVELS.desktop;
  }

  /**
   * Hides the loading placeholder
   */
  private hidePlaceholder(): void {
    const placeholder = document.querySelector("#placeholder") as HTMLDivElement;
    if (placeholder) {
      placeholder.style.opacity = "0";
    }
  }

  /**
   * Applies iOS Safari fixes when map loads
   */
  private applyIOSSafariFixesOnLoad(): void {
    if (!this.map) return;

    // Force resize after layers are added
    setTimeout(() => {
      this.map?.resize();
    }, this.config.TIMEOUTS.MAP_RESIZE);

    // Additional delay for iOS Safari
    setTimeout(() => {
      this.map?.resize();
    }, this.config.TIMEOUTS.MAP_RESIZE_ADDITIONAL);
  }

  /**
   * Applies iOS Safari fixes when source data loads
   */
  private applyIOSSafariFixesOnSourceLoad(): void {
    if (!this.map) return;

    setTimeout(() => {
      this.map?.resize();
    }, this.config.TIMEOUTS.MAP_RESIZE);
  }

  /**
   * Sets up iOS Safari specific event handlers
   */
  private setupIOSSafariEventHandlers(): void {
    if (!/iPad|iPhone|iPod/.test(navigator.userAgent) || !this.map) {
      return;
    }

    // Fix for iOS Safari viewport changes
    window.addEventListener("orientationchange", () => {
      setTimeout(() => {
        this.map?.resize();
      }, this.config.TIMEOUTS.IOS_ORIENTATION_CHANGE);
    });

    // Fix for iOS Safari page visibility changes
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        setTimeout(() => {
          this.map?.resize();
        }, this.config.TIMEOUTS.IOS_VISIBILITY_CHANGE);
      }
    });

    // Fix for iOS Safari focus/blur events
    window.addEventListener("pageshow", () => {
      setTimeout(() => {
        this.map?.resize();
      }, this.config.TIMEOUTS.IOS_PAGE_SHOW);
    });
  }

  /**
   * Gets the initialized map instance
   */
  getMap(): Map | null {
    return this.map;
  }

  /**
   * Gets the current color scheme
   */
  getColorScheme(): ColorScheme {
    return this.colorScheme;
  }

  /**
   * Manually triggers a map resize (useful for responsive layouts)
   */
  resize(): void {
    if (this.map) {
      this.map.resize();
    }
  }

  /**
   * Cleanup method to remove event listeners
   */
  cleanup(): void {
    // Remove color scheme listener
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .removeEventListener("change", () => {});

    // Note: Map-specific cleanup should be handled by MapLibre itself
    // when the map instance is destroyed
  }
}
