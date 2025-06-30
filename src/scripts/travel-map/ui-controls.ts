import { Marker } from "maplibre-gl";
import type { CityLabelData, MapConfig } from "./types";

export interface ToggleState {
  citiesVisible: boolean;
}

export class UIControls {
  private config: MapConfig;
  private map: any;
  private toggleElement: HTMLInputElement | null = null;
  private markers: Marker[] = [];
  private labels: CityLabelData[] = [];
  private onToggleChange?: (visible: boolean) => void;

  constructor(config: MapConfig, map: any) {
    this.config = config;
    this.map = map;
  }

  /**
   * Initializes the cities toggle control
   */
  initializeCitiesToggle(
    markers: Marker[],
    labels: CityLabelData[],
    onToggleChange?: (visible: boolean) => void,
  ): void {
    this.markers = markers;
    this.labels = labels;
    this.onToggleChange = onToggleChange;

    this.toggleElement = document.getElementById(
      "citiesToggle",
    ) as HTMLInputElement;
    if (!this.toggleElement) {
      console.warn("Cities toggle element not found");
      return;
    }

    console.log("Toggle element found, setting up...");
    console.log(
      `Initial markers: ${this.markers.length}, labels: ${this.labels.length}`,
    );
    this.setupToggleState();
    this.setupToggleEventListener();
  }

  /**
   * Sets up the initial toggle state from localStorage
   */
  private setupToggleState(): void {
    if (!this.toggleElement) return;

    const savedState = this.getStoredToggleState();
    console.log(`Setting up initial toggle state: ${savedState.citiesVisible}`);
    this.toggleElement.checked = savedState.citiesVisible;

    // Apply initial state
    this.applyToggleState(savedState.citiesVisible, false);
  }

  /**
   * Sets up the toggle event listener
   */
  private setupToggleEventListener(): void {
    if (!this.toggleElement) return;

    console.log("Setting up toggle event listener");
    this.toggleElement.addEventListener("change", () => {
      const isVisible = this.toggleElement!.checked;
      console.log(`Toggle changed to: ${isVisible}`);
      console.log(
        `Available markers: ${this.markers.length}, map: ${!!this.map}`,
      );
      this.applyToggleState(isVisible, true);
      this.saveToggleState({ citiesVisible: isVisible });

      // Notify callback if provided
      console.log(`Calling onToggleChange callback: ${!!this.onToggleChange}`);
      this.onToggleChange?.(isVisible);
    });
  }

  /**
   * Applies the toggle state to show/hide markers and labels
   */
  private applyToggleState(visible: boolean, animate: boolean = false): void {
    console.log(
      `Applying toggle state: ${visible}, markers count: ${this.markers.length}`,
    );

    if (visible) {
      this.showMarkers();
    } else {
      this.hideMarkers();
    }

    // Add animation class if specified
    if (animate && this.toggleElement) {
      this.addToggleAnimation();
    }
  }

  /**
   * Shows all city markers on the map
   */
  private showMarkers(): void {
    console.log(
      `Showing ${this.markers.length} markers, map available: ${!!this.map}`,
    );

    this.markers.forEach((marker, index) => {
      try {
        // Always try to add marker to map if we have a map reference
        if (this.map) {
          // Remove first to avoid duplicate addition
          marker.remove();
          marker.addTo(this.map);
          console.log(`Added marker ${index} to map`);
        } else {
          console.warn(`No map reference available for marker ${index}`);
        }
      } catch (error) {
        console.error(`Could not add marker ${index} to map:`, error);
      }
    });
  }

  /**
   * Hides all city markers and their labels
   */
  private hideMarkers(): void {
    console.log(`Hiding ${this.markers.length} markers`);

    // Hide markers
    this.markers.forEach((marker, index) => {
      try {
        marker.remove();
        console.log(`Removed marker ${index} from map`);
      } catch (error) {
        console.debug(`Could not remove marker ${index}:`, error);
      }
    });

    // Hide all labels
    this.labels.forEach(({ element }, index) => {
      element.style.display = "none";
      console.log(`Hidden label ${index}`);
    });
  }

  /**
   * Adds a brief animation to the toggle for visual feedback
   */
  private addToggleAnimation(): void {
    if (!this.toggleElement) return;

    const toggleContainer = this.toggleElement.closest(".cities-toggle");
    if (toggleContainer) {
      toggleContainer.classList.add("toggle-animation");
      setTimeout(() => {
        toggleContainer.classList.remove("toggle-animation");
      }, 200);
    }
  }

  /**
   * Gets the stored toggle state from localStorage
   */
  private getStoredToggleState(): ToggleState {
    const savedState = localStorage.getItem(this.config.STORAGE_KEY);
    return {
      citiesVisible: savedState === "true", // Default to false
    };
  }

  /**
   * Saves the toggle state to localStorage
   */
  private saveToggleState(state: ToggleState): void {
    localStorage.setItem(
      this.config.STORAGE_KEY,
      state.citiesVisible.toString(),
    );
  }

  /**
   * Gets the current toggle state
   */
  getCurrentState(): ToggleState {
    return {
      citiesVisible: this.toggleElement?.checked ?? false,
    };
  }

  /**
   * Programmatically sets the toggle state
   */
  setToggleState(visible: boolean, triggerEvent: boolean = false): void {
    if (!this.toggleElement) return;

    console.log(`Setting toggle state programmatically: ${visible}`);
    this.toggleElement.checked = visible;
    this.applyToggleState(visible, triggerEvent);
    this.saveToggleState({ citiesVisible: visible });

    if (triggerEvent) {
      this.onToggleChange?.(visible);
    }
  }

  /**
   * Updates the markers and labels references (useful when data is reloaded)
   */
  updateReferences(markers: Marker[], labels: CityLabelData[]): void {
    console.log(
      `Updating references: ${markers.length} markers, ${labels.length} labels`,
    );
    this.markers = markers;
    this.labels = labels;

    // Re-apply current state with new references
    const currentState = this.getCurrentState();
    console.log(`Re-applying current state: ${currentState.citiesVisible}`);
    this.applyToggleState(currentState.citiesVisible);
  }

  /**
   * Updates the map reference
   */
  updateMapReference(map: any): void {
    this.map = map;
  }

  /**
   * Enables or disables the toggle control
   */
  setEnabled(enabled: boolean): void {
    if (!this.toggleElement) return;

    this.toggleElement.disabled = !enabled;

    const toggleContainer = this.toggleElement.closest(".cities-toggle");
    if (toggleContainer) {
      if (enabled) {
        toggleContainer.classList.remove("disabled");
      } else {
        toggleContainer.classList.add("disabled");
      }
    }
  }

  /**
   * Shows a loading state on the toggle
   */
  setLoading(loading: boolean): void {
    if (!this.toggleElement) return;

    const toggleContainer = this.toggleElement.closest(".cities-toggle");
    if (toggleContainer) {
      if (loading) {
        toggleContainer.classList.add("loading");
        this.setEnabled(false);
      } else {
        toggleContainer.classList.remove("loading");
        this.setEnabled(true);
      }
    }
  }

  /**
   * Adds a custom toggle control (extensible for future controls)
   */
  addCustomToggle(
    elementId: string,
    storageKey: string,
    onToggle: (checked: boolean) => void,
    defaultState: boolean = false,
  ): void {
    const element = document.getElementById(elementId) as HTMLInputElement;
    if (!element) {
      console.warn(`Custom toggle element '${elementId}' not found`);
      return;
    }

    // Set initial state
    const savedState = localStorage.getItem(storageKey);
    const initialState =
      savedState !== null ? savedState === "true" : defaultState;
    element.checked = initialState;
    onToggle(initialState);

    // Add event listener
    element.addEventListener("change", () => {
      const isChecked = element.checked;
      localStorage.setItem(storageKey, isChecked.toString());
      onToggle(isChecked);
    });
  }

  /**
   * Clears all stored toggle states
   */
  clearStoredStates(): void {
    localStorage.removeItem(this.config.STORAGE_KEY);
  }

  /**
   * Gets debugging information about the UI controls
   */
  getDebugInfo(): {
    hasToggleElement: boolean;
    markersCount: number;
    labelsCount: number;
    currentState: ToggleState;
    storedState: ToggleState;
  } {
    return {
      hasToggleElement: !!this.toggleElement,
      markersCount: this.markers.length,
      labelsCount: this.labels.length,
      currentState: this.getCurrentState(),
      storedState: this.getStoredToggleState(),
    };
  }

  /**
   * Cleanup method to remove event listeners
   */
  cleanup(): void {
    if (this.toggleElement) {
      // Clone and replace to remove all event listeners
      const newToggle = this.toggleElement.cloneNode(true) as HTMLInputElement;
      this.toggleElement.parentNode?.replaceChild(
        newToggle,
        this.toggleElement,
      );
      this.toggleElement = null;
    }

    this.markers = [];
    this.labels = [];
    this.onToggleChange = undefined;
  }
}
