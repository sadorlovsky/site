import type { MapConfig } from "./types";

export class LabelManager {
  private visibleLabels = new globalThis.Map<HTMLElement, [number, number]>();
  private map: any;
  private config: MapConfig;

  constructor(map: any, config: MapConfig) {
    this.map = map;
    this.config = config;
  }

  /**
   * Shows a city label at the specified coordinates
   */
  showLabel(
    labelElement: HTMLElement,
    coordinates: [number, number],
  ): void {
    if (!this.map) return;

    // Add to visible labels tracking
    this.visibleLabels.set(labelElement, coordinates);

    // Update position and show
    this.updateLabelPosition(labelElement, coordinates);
    labelElement.style.display = "block";
  }

  /**
   * Hides a city label
   */
  hideLabel(labelElement: HTMLElement): void {
    labelElement.style.display = "none";
    // Remove from visible labels tracking
    this.visibleLabels.delete(labelElement);
  }

  /**
   * Hides all currently visible labels
   */
  hideAllLabels(): void {
    this.visibleLabels.forEach((coordinates, labelElement) => {
      this.hideLabel(labelElement);
    });
  }

  /**
   * Updates a single label's position based on its coordinates
   */
  private updateLabelPosition(
    labelElement: HTMLElement,
    coordinates: [number, number],
  ): void {
    if (!this.map) return;

    const screenCoords = this.map.project(coordinates);
    labelElement.style.left = `${screenCoords.x}px`;
    labelElement.style.top = `${screenCoords.y - this.config.LABEL_OFFSET}px`;
  }

  /**
   * Updates all visible labels' positions (called during map movement)
   */
  updateAllVisibleLabels(): void {
    this.visibleLabels.forEach(
      (coordinates: [number, number], labelElement: HTMLElement) => {
        this.updateLabelPosition(labelElement, coordinates);
      },
    );
  }

  /**
   * Checks if a label is currently visible
   */
  isLabelVisible(labelElement: HTMLElement): boolean {
    return this.visibleLabels.has(labelElement);
  }

  /**
   * Gets the count of currently visible labels
   */
  getVisibleLabelCount(): number {
    return this.visibleLabels.size;
  }

  /**
   * Gets all visible labels and their coordinates
   */
  getVisibleLabels(): Map<HTMLElement, [number, number]> {
    return new globalThis.Map(this.visibleLabels);
  }

  /**
   * Toggles a label's visibility
   */
  toggleLabel(
    labelElement: HTMLElement,
    coordinates: [number, number],
  ): boolean {
    if (this.isLabelVisible(labelElement)) {
      this.hideLabel(labelElement);
      return false;
    } else {
      // Hide all other labels first (single label at a time for mobile)
      this.hideAllLabels();
      this.showLabel(labelElement, coordinates);
      return true;
    }
  }

  /**
   * Cleanup method to remove all labels and clear tracking
   */
  cleanup(): void {
    this.hideAllLabels();
    this.visibleLabels.clear();
  }
}
