/**
 * Performance utilities for the travel map application
 * Provides production-optimized logging, monitoring, and DOM batching
 */

// Production environment detection
const IS_PRODUCTION = import.meta.env.PROD;
const IS_DEVELOPMENT = import.meta.env.DEV;

// Performance monitoring
interface PerformanceMetrics {
  frameRate: number;
  memoryUsage?: number;
  domOperations: number;
  lastFrameTime: number;
  averageFrameTime: number;
}

class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private frameRates: number[] = [];
  private domOperations = 0;
  private readonly maxSamples = 60; // Track last 60 frames

  startFrame(): void {
    if (!IS_DEVELOPMENT) return;

    const now = performance.now();
    const delta = now - this.lastTime;

    if (delta > 0) {
      const fps = 1000 / delta;
      this.frameRates.push(fps);

      if (this.frameRates.length > this.maxSamples) {
        this.frameRates.shift();
      }
    }

    this.lastTime = now;
    this.frameCount++;
  }

  recordDOMOperation(): void {
    this.domOperations++;
  }

  getMetrics(): PerformanceMetrics {
    const avgFrameRate =
      this.frameRates.length > 0
        ? this.frameRates.reduce((a, b) => a + b, 0) / this.frameRates.length
        : 60;

    return {
      frameRate: Math.round(avgFrameRate),
      memoryUsage: this.getMemoryUsage(),
      domOperations: this.domOperations,
      lastFrameTime: this.lastTime,
      averageFrameTime: 1000 / avgFrameRate,
    };
  }

  private getMemoryUsage(): number | undefined {
    if ("memory" in performance) {
      return Math.round(
        (performance as any).memory.usedJSHeapSize / 1024 / 1024,
      );
    }
    return undefined;
  }

  reset(): void {
    this.frameRates = [];
    this.domOperations = 0;
    this.frameCount = 0;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Production-safe logging
export const Logger = {
  log: IS_DEVELOPMENT ? console.log.bind(console) : () => {},
  warn: IS_DEVELOPMENT ? console.warn.bind(console) : () => {},
  error: console.error.bind(console), // Always log errors
  debug: IS_DEVELOPMENT ? console.debug.bind(console) : () => {},
  group: IS_DEVELOPMENT ? console.group.bind(console) : () => {},
  groupEnd: IS_DEVELOPMENT ? console.groupEnd.bind(console) : () => {},
  time: IS_DEVELOPMENT ? console.time.bind(console) : () => {},
  timeEnd: IS_DEVELOPMENT ? console.timeEnd.bind(console) : () => {},
};

// Optimized debouncing for different use cases
export class SmartDebouncer {
  private timeouts = new Map<string, NodeJS.Timeout>();
  private frameIds = new Map<string, number>();

  /**
   * Standard debounce with setTimeout
   */
  debounce(key: string, fn: () => void, delay: number): void {
    const existingTimeout = this.timeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeoutId = setTimeout(() => {
      fn();
      this.timeouts.delete(key);
    }, delay);

    this.timeouts.set(key, timeoutId);
  }

  /**
   * Frame-based debounce using requestAnimationFrame
   * Better for visual updates
   */
  debounceFrame(key: string, fn: () => void): void {
    const existingFrameId = this.frameIds.get(key);
    if (existingFrameId) {
      cancelAnimationFrame(existingFrameId);
    }

    const frameId = requestAnimationFrame(() => {
      performanceMonitor.startFrame();
      fn();
      this.frameIds.delete(key);
    });

    this.frameIds.set(key, frameId);
  }

  /**
   * Throttled execution - ensures function runs at most once per interval
   */
  throttle(key: string, fn: () => void, interval: number): void {
    if (this.timeouts.has(key)) {
      return; // Already scheduled
    }

    fn(); // Execute immediately

    const timeoutId = setTimeout(() => {
      this.timeouts.delete(key);
    }, interval);

    this.timeouts.set(key, timeoutId);
  }

  /**
   * Clear all pending operations
   */
  clear(): void {
    this.timeouts.forEach(clearTimeout);
    this.frameIds.forEach(cancelAnimationFrame);
    this.timeouts.clear();
    this.frameIds.clear();
  }
}

// Global debouncer instance
export const debouncer = new SmartDebouncer();

// DOM Batch Operations for better performance
export class DOMBatcher {
  private readOperations: Array<() => void> = [];
  private writeOperations: Array<() => void> = [];
  private scheduled = false;

  /**
   * Schedule a DOM read operation (measurements, getting positions, etc.)
   */
  read(operation: () => void): void {
    this.readOperations.push(operation);
    this.schedule();
  }

  /**
   * Schedule a DOM write operation (style changes, adding elements, etc.)
   */
  write(operation: () => void): void {
    this.writeOperations.push(operation);
    this.schedule();
  }

  /**
   * Batch a series of DOM operations
   */
  batch(operations: {
    reads?: Array<() => void>;
    writes?: Array<() => void>;
  }): void {
    if (operations.reads) {
      this.readOperations.push(...operations.reads);
    }
    if (operations.writes) {
      this.writeOperations.push(...operations.writes);
    }
    this.schedule();
  }

  private schedule(): void {
    if (this.scheduled) return;

    this.scheduled = true;

    requestAnimationFrame(() => {
      performanceMonitor.startFrame();

      // Execute all read operations first
      const reads = [...this.readOperations];
      this.readOperations = [];
      reads.forEach((op) => {
        try {
          op();
          performanceMonitor.recordDOMOperation();
        } catch (error) {
          Logger.error("DOM read operation failed:", error);
        }
      });

      // Then execute all write operations
      const writes = [...this.writeOperations];
      this.writeOperations = [];
      writes.forEach((op) => {
        try {
          op();
          performanceMonitor.recordDOMOperation();
        } catch (error) {
          Logger.error("DOM write operation failed:", error);
        }
      });

      this.scheduled = false;

      // If more operations were added during execution, schedule again
      if (this.readOperations.length > 0 || this.writeOperations.length > 0) {
        this.schedule();
      }
    });
  }

  /**
   * Force immediate execution of all pending operations
   */
  flush(): void {
    if (!this.scheduled) return;

    // Cancel the scheduled frame
    this.scheduled = false;

    // Execute operations synchronously
    [...this.readOperations, ...this.writeOperations].forEach((op) => {
      try {
        op();
      } catch (error) {
        Logger.error("DOM operation failed during flush:", error);
      }
    });

    this.readOperations = [];
    this.writeOperations = [];
  }
}

// Global DOM batcher instance
export const domBatcher = new DOMBatcher();

// Memory management utilities
export const MemoryUtils = {
  /**
   * Clean up event listeners and references
   */
  cleanup(element: HTMLElement): void {
    // Remove all event listeners by cloning the element
    const newElement = element.cloneNode(true) as HTMLElement;
    element.parentNode?.replaceChild(newElement, element);
  },

  /**
   * Force garbage collection if available (Chrome DevTools)
   */
  forceGC(): void {
    if (IS_DEVELOPMENT && (window as any).gc) {
      (window as any).gc();
    }
  },

  /**
   * Get current memory usage if available
   */
  getMemoryInfo(): { used: number; total: number; limit: number } | null {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
      };
    }
    return null;
  },
};

// Intersection Observer for efficient visibility detection
export class VisibilityManager {
  private observer: IntersectionObserver | null = null;
  private callbacks = new Map<Element, (visible: boolean) => void>();

  constructor(options?: IntersectionObserverInit) {
    if ("IntersectionObserver" in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const callback = this.callbacks.get(entry.target);
            if (callback) {
              callback(entry.isIntersecting);
            }
          });
        },
        {
          rootMargin: "50px",
          threshold: [0, 0.1, 0.5, 1],
          ...options,
        },
      );
    }
  }

  observe(element: Element, callback: (visible: boolean) => void): void {
    if (!this.observer) {
      // Fallback for browsers without IntersectionObserver
      callback(true);
      return;
    }

    this.callbacks.set(element, callback);
    this.observer.observe(element);
  }

  unobserve(element: Element): void {
    if (this.observer) {
      this.observer.unobserve(element);
    }
    this.callbacks.delete(element);
  }

  cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.callbacks.clear();
  }
}

// Performance timing utilities
export const PerfTimer = {
  start(name: string): void {
    if (IS_DEVELOPMENT) {
      performance.mark(`${name}-start`);
    }
  },

  end(name: string): number | null {
    if (!IS_DEVELOPMENT) return null;

    try {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);

      const measure = performance.getEntriesByName(name, "measure")[0];
      return measure ? measure.duration : null;
    } catch (error) {
      Logger.warn(`Performance measurement failed for ${name}:`, error);
      return null;
    }
  },

  measure(name: string, fn: () => void): number | null {
    this.start(name);
    fn();
    return this.end(name);
  },

  async measureAsync(
    name: string,
    fn: () => Promise<void>,
  ): Promise<number | null> {
    this.start(name);
    await fn();
    return this.end(name);
  },
};

// Utility to detect if user prefers reduced motion
export const prefersReducedMotion = (): boolean => {
  return (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
};

// Device capability detection
export const DeviceCapabilities = {
  isLowEndDevice(): boolean {
    // Check for indicators of low-end devices
    const memory = MemoryUtils.getMemoryInfo();
    if (memory && memory.limit < 1000) return true; // Less than 1GB JS heap limit

    // Check hardware concurrency (CPU cores)
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
      return true;
    }

    // Check connection type
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;
    if (
      connection &&
      (connection.effectiveType === "slow-2g" ||
        connection.effectiveType === "2g")
    ) {
      return true;
    }

    return false;
  },

  isTouchDevice(): boolean {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  },

  supportsHover(): boolean {
    return (
      window.matchMedia &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    );
  },
};

// Export production configuration
export const PRODUCTION_CONFIG = {
  DISABLE_ANIMATIONS:
    prefersReducedMotion() || DeviceCapabilities.isLowEndDevice(),
  REDUCED_PARTICLES: DeviceCapabilities.isLowEndDevice(),
  ENABLE_PERFORMANCE_MONITORING: IS_DEVELOPMENT,
  BATCH_DOM_OPERATIONS: true,
  USE_INTERSECTION_OBSERVER: "IntersectionObserver" in window,
  OPTIMIZE_FOR_MOBILE: DeviceCapabilities.isTouchDevice(),
};
