import type { MapConfig } from "./types";
import {
  Logger,
  domBatcher,
  debouncer,
  performanceMonitor,
  PerfTimer,
} from "./performance-utils";

export class LabelManager {
  private visibleLabels = new globalThis.Map<HTMLElement, [number, number]>();
  private map: any;
  private config: MapConfig;
  private updatePending = false;
  private lastUpdateTime = 0;
  private readonly UPDATE_THROTTLE_MS = 16; // ~60fps

  constructor(map: any, config: MapConfig) {
    this.map = map;
    this.config = config;
  }

  /**
   * Shows a city label at the specified coordinates
   */
  showLabel(labelElement: HTMLElement, coordinates: [number, number]): void {
    if (!this.map) return;

    // Add to visible labels tracking
    this.visibleLabels.set(labelElement, coordinates);

    // Use DOM batcher for optimal performance
    domBatcher.batch({
      reads: [
        () => {
          // Pre-calculate position
          const screenCoords = this.map.project(coordinates);
          const transform = `translate(${screenCoords.x}px, ${screenCoords.y - this.config.LABEL_OFFSET}px)`;

          // Schedule the write operation
          domBatcher.write(() => {
            labelElement.style.transform = transform;
            labelElement.style.display = "";
            performanceMonitor.recordDOMOperation();
          });
        },
      ],
    });
  }

  /**
   * Hides a city label
   */
  hideLabel(labelElement: HTMLElement): void {
    // Remove from visible labels tracking first
    this.visibleLabels.delete(labelElement);
    // Hide immediately - no need to batch this
    domBatcher.write(() => {
      labelElement.style.display = "none";
      performanceMonitor.recordDOMOperation();
    });
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
   * Uses transform for better performance than left/top
   */
  private updateLabelPosition(
    labelElement: HTMLElement,
    coordinates: [number, number],
  ): void {
    if (!this.map) return;

    domBatcher.read(() => {
      const screenCoords = this.map.project(coordinates);
      const transform = `translate(${screenCoords.x}px, ${screenCoords.y - this.config.LABEL_OFFSET}px)`;

      domBatcher.write(() => {
        labelElement.style.transform = transform;
        performanceMonitor.recordDOMOperation();
      });
    });
  }

  /**
   * Updates all visible labels' positions (called during map movement)
   * Throttled to prevent excessive updates during map movement
   */
  updateAllVisibleLabels(): void {
    // Skip if no visible labels
    if (this.visibleLabels.size === 0) {
      return;
    }

    // Use smart debouncer for optimal performance
    debouncer.debounceFrame("labelUpdate", () => {
      this.performLabelUpdate();
    });
  }

  /**
   * Performs the actual label position update
   * Batches all calculations first, then applies DOM changes
   */
  private performLabelUpdate(): void {
    PerfTimer.start("labelUpdate");
    this.lastUpdateTime = Date.now();

    if (this.visibleLabels.size === 0) {
      PerfTimer.end("labelUpdate");
      return;
    }

    // Batch all read operations first
    const readOperations: Array<() => void> = [];
    const writeOperations: Array<() => void> = [];

    this.visibleLabels.forEach((coordinates, labelElement) => {
      readOperations.push(() => {
        const screenCoords = this.map.project(coordinates);
        const transform = `translate(${screenCoords.x}px, ${screenCoords.y - this.config.LABEL_OFFSET}px)`;

        writeOperations.push(() => {
          labelElement.style.transform = transform;
          performanceMonitor.recordDOMOperation();
        });
      });
    });

    // Use DOM batcher for optimal performance
    domBatcher.batch({
      reads: readOperations,
      writes: writeOperations,
    });

    PerfTimer.end("labelUpdate");
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
    Logger.debug("Cleaning up LabelManager");
    this.hideAllLabels();
    this.visibleLabels.clear();
    this.updatePending = false;
    this.lastUpdateTime = 0;

    // Clear any pending debounced operations
    debouncer.clear();
  }
}
