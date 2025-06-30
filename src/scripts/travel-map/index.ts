import type { MapConfig } from "./types";
import { MapInitializer } from "./map-initialization";
import { DataLoader } from "./data-loader";
import { CityMarkerManager } from "./city-markers";
import { LabelManager } from "./label-manager";
import { SimpleToggle } from "./simple-toggle";
import { ErrorHandler, setupGlobalErrorHandler } from "./error-handler";

// Centralized configuration constants
const CONFIG: MapConfig = {
  MOBILE_BREAKPOINT: 480,
  ZOOM_LEVELS: { mobile: 1, desktop: 2 },
  TIMEOUTS: {
    MAP_RESIZE: 100,
    MAP_RESIZE_ADDITIONAL: 500,
    PREVENT_CLICK: 50,
    ERROR_DISPLAY: 5000,
    IOS_ORIENTATION_CHANGE: 200,
    IOS_VISIBILITY_CHANGE: 100,
    IOS_PAGE_SHOW: 100,
  },
  LABEL_OFFSET: 35,
  STORAGE_KEY: "travel-map-cities-visible",
};

/**
 * Main Travel Map Application
 */
class TravelMapApp {
  private mapInitializer: MapInitializer;
  private dataLoader: DataLoader;
  private cityMarkerManager: CityMarkerManager | null = null;
  private labelManager: LabelManager | null = null;
  private simpleToggle: SimpleToggle | null = null;
  private errorHandler: ErrorHandler;
  private preventMapClick = false;

  constructor() {
    // Initialize all modules
    this.errorHandler = new ErrorHandler(CONFIG);
    this.mapInitializer = new MapInitializer(CONFIG);
    this.dataLoader = new DataLoader();
    // UIControls will be initialized after map is ready

    // Set up global error handling
    setupGlobalErrorHandler(this.errorHandler);
  }

  /**
   * Initializes and starts the travel map application
   */
  async initialize(): Promise<void> {
    try {
      console.log("Initializing Travel Map Application...");

      // Step 1: Initialize the map
      const map = await this.initializeMap();

      // Step 2: Load travel data
      const travelData = await this.loadTravelData();

      // Step 3: Set up map functionality
      await this.setupMapFunctionality(map, travelData);

      console.log("Travel Map Application initialized successfully!");
    } catch (error) {
      console.error("Failed to initialize Travel Map Application:", error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Initializes the map and sets up basic functionality
   */
  private async initializeMap() {
    try {
      const map = await this.mapInitializer.initializeMap();

      // Initialize label manager now that we have a map
      this.labelManager = new LabelManager(map, CONFIG);

      // Initialize SimpleToggle with map reference and label hiding callback
      this.simpleToggle = new SimpleToggle(map, () =>
        this.labelManager?.hideAllLabels(),
      );

      return map;
    } catch (error) {
      this.errorHandler.handleMapInitError(error as Error);
      throw error;
    }
  }

  /**
   * Loads and processes travel data
   */
  private async loadTravelData() {
    try {
      const travelData = await this.dataLoader.loadData();
      return travelData;
    } catch (error) {
      this.errorHandler.handleDataLoadError(error as any);
      throw error;
    }
  }

  /**
   * Sets up map functionality with loaded data
   */
  private async setupMapFunctionality(map: any, travelData: any) {
    // Initialize city marker manager
    this.cityMarkerManager = new CityMarkerManager(
      map,
      CONFIG,
      (element, coordinates) =>
        this.labelManager?.showLabel(element, coordinates),
      (element) => this.labelManager?.hideLabel(element),
      () => this.setPreventMapClick(),
    );

    // Create markers from travel data
    const { markers, labels } = this.cityMarkerManager.createMarkersFromCities(
      travelData.cities,
      travelData.visitedCityNames,
    );

    // Add labels to the map container
    this.cityMarkerManager.addLabelsToContainer();

    // Set up map event handlers
    this.setupMapEventHandlers(map);

    // Set up UI controls with the created markers and labels
    this.setupUIControls(markers, labels);

    console.log(
      `Set up ${markers.length} city markers with ${labels.length} labels`,
    );

    // Debug: Log current toggle state
    const toggleElement = document.getElementById(
      "citiesToggle",
    ) as HTMLInputElement;
    console.log(
      `Toggle element found: ${!!toggleElement}, checked: ${toggleElement?.checked}`,
    );
  }

  /**
   * Sets up map event handlers
   */
  private setupMapEventHandlers(map: any): void {
    // Map click handler to hide labels when clicking elsewhere
    map.on("click", () => {
      if (this.preventMapClick) {
        return;
      }

      this.labelManager?.hideAllLabels();
    });

    // Map move handler to update label positions
    map.on("move", () => {
      this.labelManager?.updateAllVisibleLabels();
    });
  }

  /**
   * Sets up UI controls (toggle buttons, etc.)
   */
  private setupUIControls(markers: any[], labels: any[]): void {
    console.log(
      `Setting up UI controls with ${markers.length} markers and ${labels.length} labels`,
    );

    // Wait for DOM to be ready before setting up toggle
    setTimeout(() => {
      if (this.simpleToggle) {
        this.simpleToggle.init(markers);
      }
    }, 100);
  }

  /**
   * Sets the prevent map click flag to avoid conflicts with marker interactions
   */
  private setPreventMapClick(): void {
    this.preventMapClick = true;
    setTimeout(() => {
      this.preventMapClick = false;
    }, CONFIG.TIMEOUTS.PREVENT_CLICK);
  }

  /**
   * Handles initialization errors
   */
  private handleInitializationError(error: unknown): void {
    if (error instanceof Error) {
      this.errorHandler.handleGeneralError(error, "Application initialization");
    } else {
      this.errorHandler.handleGeneralError(
        new Error("Unknown initialization error"),
        "Application initialization",
      );
    }
  }

  /**
   * Public method to get current application state (for debugging)
   */
  getDebugInfo() {
    return {
      mapInitialized: !!this.mapInitializer.getMap(),
      colorScheme: this.mapInitializer.getColorScheme(),
      labelManager: {
        visibleLabels: this.labelManager?.getVisibleLabelCount() || 0,
      },
      simpleToggle: {
        hasToggle: !!this.simpleToggle,
        currentState: this.simpleToggle?.getState() || false,
      },
      errorLog: this.errorHandler.getErrorLog(),
    };
  }

  /**
   * Cleanup method for proper resource management
   */
  cleanup(): void {
    this.labelManager?.cleanup();
    this.cityMarkerManager = null;
    this.simpleToggle = null;
    this.errorHandler.cleanup();
    this.mapInitializer.cleanup();
  }
}

// Initialize the application when DOM is ready
function initializeApp(): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      const app = new TravelMapApp();
      app.initialize();

      // Make app available globally for debugging
      (window as any).travelMapApp = app;
    });
  } else {
    const app = new TravelMapApp();
    app.initialize();

    // Make app available globally for debugging
    (window as any).travelMapApp = app;
  }
}

// Start the application
initializeApp();

// Export for module usage if needed
export { TravelMapApp, CONFIG };
