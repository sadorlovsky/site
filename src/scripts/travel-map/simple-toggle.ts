import { Marker } from "maplibre-gl";

export class SimpleToggle {
  private toggleElement: HTMLInputElement | null = null;
  private markers: Marker[] = [];
  private map: any;
  private storageKey = "travel-map-cities-visible";
  private onHideLabels?: () => void;
  private markersVisible = false;

  constructor(map: any, onHideLabels?: () => void) {
    this.map = map;
    this.onHideLabels = onHideLabels;
  }

  /**
   * Initialize the toggle with markers
   */
  init(markers: Marker[]): void {
    this.markers = markers;
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

    // Get saved state (default to false)
    const savedState = localStorage.getItem(this.storageKey);
    const initialState = savedState === "true";

    // Set toggle state
    this.toggleElement.checked = initialState;

    // Apply initial state
    this.applyState(initialState);

    // Add event listener
    this.toggleElement.addEventListener("change", () => {
      const isChecked = this.toggleElement!.checked;
      this.applyState(isChecked);
      this.saveState(isChecked);
    });
  }

  /**
   * Apply the toggle state (show/hide markers)
   */
  private applyState(visible: boolean): void {
    if (!this.map || this.markersVisible === visible) {
      return;
    }

    // Batch marker operations for better performance
    if (visible) {
      this.markers.forEach((marker) => {
        marker.addTo(this.map);
      });
    } else {
      this.markers.forEach((marker) => {
        marker.remove();
      });

      // Hide all labels when toggling off
      this.onHideLabels?.();
    }

    this.markersVisible = visible;
  }

  /**
   * Save toggle state to localStorage
   */
  private saveState(visible: boolean): void {
    localStorage.setItem(this.storageKey, visible.toString());
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
    // Reset state tracking when markers change
    this.markersVisible = false;
    this.markers = markers;

    // Re-apply current state
    const currentState = this.getState();
    this.applyState(currentState);
  }
}
