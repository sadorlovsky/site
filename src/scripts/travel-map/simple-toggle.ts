import { Marker } from "maplibre-gl";

export class SimpleToggle {
  private toggleElement: HTMLInputElement | null = null;
  private markers: Marker[] = [];
  private map: any;
  private storageKey = "travel-map-cities-visible";
  private onHideLabels?: () => void;

  constructor(map: any, onHideLabels?: () => void) {
    this.map = map;
    this.onHideLabels = onHideLabels;
  }

  /**
   * Initialize the toggle with markers
   */
  init(markers: Marker[]): void {
    this.markers = markers;
    console.log(`SimpleToggle: Initializing with ${markers.length} markers`);

    this.setupToggleElement();
  }

  /**
   * Set up the toggle element and event listeners
   */
  private setupToggleElement(): void {
    this.toggleElement = document.getElementById(
      "citiesToggle",
    ) as HTMLInputElement;

    if (!this.toggleElement) {
      console.error("SimpleToggle: Toggle element not found");
      return;
    }

    console.log("SimpleToggle: Toggle element found");

    // Get saved state (default to false)
    const savedState = localStorage.getItem(this.storageKey);
    const initialState = savedState === "true";

    console.log(
      `SimpleToggle: Initial state from localStorage: ${initialState}`,
    );

    // Set toggle state
    this.toggleElement.checked = initialState;

    // Apply initial state
    this.applyState(initialState);

    // Add event listener
    this.toggleElement.addEventListener("change", () => {
      const isChecked = this.toggleElement!.checked;
      console.log(`SimpleToggle: Toggle changed to ${isChecked}`);

      this.applyState(isChecked);
      this.saveState(isChecked);
    });

    console.log("SimpleToggle: Setup complete");
  }

  /**
   * Apply the toggle state (show/hide markers)
   */
  private applyState(visible: boolean): void {
    console.log(
      `SimpleToggle: Applying state ${visible} to ${this.markers.length} markers`,
    );

    if (!this.map) {
      console.error("SimpleToggle: No map available");
      return;
    }

    if (visible) {
      // Show markers
      this.markers.forEach((marker, index) => {
        try {
          // Remove first to avoid duplicates
          marker.remove();
          marker.addTo(this.map);
          console.log(`SimpleToggle: Added marker ${index}`);
        } catch (error) {
          console.error(`SimpleToggle: Error adding marker ${index}:`, error);
        }
      });
    } else {
      // Hide markers
      this.markers.forEach((marker, index) => {
        try {
          marker.remove();
          console.log(`SimpleToggle: Removed marker ${index}`);
        } catch (error) {
          console.error(`SimpleToggle: Error removing marker ${index}:`, error);
        }
      });

      // Also hide all labels when toggling off
      if (this.onHideLabels) {
        this.onHideLabels();
        console.log(`SimpleToggle: Hiding all labels`);
      }
    }
  }

  /**
   * Save toggle state to localStorage
   */
  private saveState(visible: boolean): void {
    localStorage.setItem(this.storageKey, visible.toString());
    console.log(`SimpleToggle: Saved state ${visible} to localStorage`);
  }

  /**
   * Get current toggle state
   */
  getState(): boolean {
    return this.toggleElement?.checked ?? false;
  }

  /**
   * Set toggle state programmatically
   */
  setState(visible: boolean): void {
    if (this.toggleElement) {
      this.toggleElement.checked = visible;
      this.applyState(visible);
      this.saveState(visible);
    }
  }

  /**
   * Update markers array (for when data is reloaded)
   */
  updateMarkers(markers: Marker[]): void {
    console.log(
      `SimpleToggle: Updating markers from ${this.markers.length} to ${markers.length}`,
    );
    this.markers = markers;

    // Re-apply current state
    const currentState = this.getState();
    this.applyState(currentState);
  }
}
