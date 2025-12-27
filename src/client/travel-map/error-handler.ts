import type { DataLoadError, MapConfig } from "./types";

export interface ErrorDisplayOptions {
  title?: string;
  message: string;
  type?: "error" | "warning" | "info";
  duration?: number;
  showRetry?: boolean;
  onRetry?: () => void;
  persistent?: boolean;
}

export interface ErrorDetails {
  code: string;
  message: string;
  originalError?: Error;
  timestamp: Date;
  context?: Record<string, any>;
}

export class ErrorHandler {
  private config: MapConfig;
  private errorContainer: HTMLElement | null = null;
  private activeErrors: Map<string, HTMLElement> = new Map();
  private errorLog: ErrorDetails[] = [];
  private maxLogSize = 50;

  constructor(config: MapConfig) {
    this.config = config;
    this.initializeErrorContainer();
  }

  /**
   * Initializes the error display container
   */
  private initializeErrorContainer(): void {
    const mapContainer = document.getElementById("map");
    if (!mapContainer) {
      console.warn(
        "Map container not found, error display may not work properly",
      );
      return;
    }

    this.errorContainer = document.createElement("div");
    this.errorContainer.className = "error-container";
    this.errorContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10000;
      pointer-events: none;
    `;
    mapContainer.appendChild(this.errorContainer);
  }

  /**
   * Handles map initialization errors
   */
  handleMapInitError(error: Error): void {
    const errorDetails: ErrorDetails = {
      code: "MAP_INIT_ERROR",
      message: "Failed to initialize map",
      originalError: error,
      timestamp: new Date(),
      context: { userAgent: navigator.userAgent },
    };

    this.logError(errorDetails);

    this.showError({
      title: "Map Loading Error",
      message:
        "Unable to load the travel map. Please refresh the page to try again.",
      type: "error",
      showRetry: true,
      persistent: true,
      onRetry: () => window.location.reload(),
    });
  }

  /**
   * Handles data loading errors
   */
  handleDataLoadError(error: DataLoadError): void {
    const errorDetails: ErrorDetails = {
      code: "DATA_LOAD_ERROR",
      message: error.message,
      originalError: error,
      timestamp: new Date(),
      context: {
        statusCode: error.statusCode,
        cause: error.cause?.message,
      },
    };

    this.logError(errorDetails);

    let message = "Failed to load travel data.";
    let showRetry = true;

    // Customize message based on error type
    if (error.statusCode === 404) {
      message =
        "Travel data files not found. Please check if the data files are available.";
      showRetry = false;
    } else if (error.statusCode && error.statusCode >= 500) {
      message =
        "Server error occurred while loading travel data. Please try again later.";
    } else if (error.message.includes("Invalid")) {
      message = "Travel data format is invalid. Please contact support.";
      showRetry = false;
    } else if (error.message.includes("Network")) {
      message =
        "Network error occurred. Please check your internet connection.";
    }

    this.showError({
      title: "Data Loading Error",
      message,
      type: "error",
      showRetry,
      onRetry: () => window.location.reload(),
    });
  }

  /**
   * Handles general application errors
   */
  handleGeneralError(error: Error, context?: string): void {
    const errorDetails: ErrorDetails = {
      code: "GENERAL_ERROR",
      message: error.message,
      originalError: error,
      timestamp: new Date(),
      context: { context },
    };

    this.logError(errorDetails);

    this.showError({
      title: "Application Error",
      message:
        "An unexpected error occurred. The page will be refreshed automatically.",
      type: "error",
      duration: 5000,
      onRetry: () => window.location.reload(),
    });

    // Auto-refresh after a delay for general errors
    setTimeout(() => {
      window.location.reload();
    }, 5000);
  }

  /**
   * Shows a warning message to the user
   */
  showWarning(message: string, duration?: number): void {
    this.showError({
      title: "Warning",
      message,
      type: "warning",
      duration: duration || 4000,
    });
  }

  /**
   * Shows an info message to the user
   */
  showInfo(message: string, duration?: number): void {
    this.showError({
      title: "Information",
      message,
      type: "info",
      duration: duration || 3000,
    });
  }

  /**
   * Displays an error message to the user
   */
  private showError(options: ErrorDisplayOptions): void {
    if (!this.errorContainer) {
      // Fallback to alert if container is not available
      alert(`${options.title || "Error"}: ${options.message}`);
      return;
    }

    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const errorElement = this.createErrorElement(errorId, options);

    this.errorContainer.appendChild(errorElement);
    this.activeErrors.set(errorId, errorElement);

    // Auto-remove after duration (if not persistent)
    if (!options.persistent && options.duration !== 0) {
      setTimeout(() => {
        this.removeError(errorId);
      }, options.duration || this.config.TIMEOUTS.ERROR_DISPLAY);
    }

    // Add entrance animation
    requestAnimationFrame(() => {
      errorElement.classList.add("error-visible");
    });
  }

  /**
   * Creates an error display element
   */
  private createErrorElement(
    errorId: string,
    options: ErrorDisplayOptions,
  ): HTMLElement {
    const errorDiv = document.createElement("div");
    errorDiv.className = `error-message error-${options.type || "error"}`;
    errorDiv.style.cssText = `
      background: ${this.getErrorBackground(options.type || "error")};
      color: white;
      padding: 12px 16px;
      margin: 8px;
      border-radius: 6px;
      font-size: 14px;
      line-height: 1.4;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-left: 4px solid ${this.getErrorBorder(options.type || "error")};
      pointer-events: auto;
      transform: translateY(-20px);
      opacity: 0;
      transition: all 0.3s ease;
      max-width: 400px;
      word-wrap: break-word;
    `;

    // Create content
    const content = document.createElement("div");
    content.style.cssText =
      "display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;";

    const textContent = document.createElement("div");
    textContent.style.flex = "1";

    if (options.title) {
      const title = document.createElement("div");
      title.textContent = options.title;
      title.style.cssText = "font-weight: 600; margin-bottom: 4px;";
      textContent.appendChild(title);
    }

    const message = document.createElement("div");
    message.textContent = options.message;
    message.style.cssText = "font-size: 13px; opacity: 0.95;";
    textContent.appendChild(message);

    content.appendChild(textContent);

    // Create buttons container
    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.cssText = "display: flex; gap: 8px; flex-shrink: 0;";

    // Add retry button if specified
    if (options.showRetry && options.onRetry) {
      const retryButton = this.createButton("Retry", () => {
        this.removeError(errorId);
        options.onRetry!();
      });
      buttonsContainer.appendChild(retryButton);
    }

    // Add close button (always present unless persistent error without retry)
    if (!options.persistent || options.showRetry) {
      const closeButton = this.createButton(
        "×",
        () => {
          this.removeError(errorId);
        },
        true,
      );
      closeButton.style.cssText +=
        "font-size: 18px; font-weight: bold; padding: 2px 8px;";
      buttonsContainer.appendChild(closeButton);
    }

    content.appendChild(buttonsContainer);
    errorDiv.appendChild(content);

    // Add visible class for animation
    errorDiv.classList.add("error-hidden");

    return errorDiv;
  }

  /**
   * Creates a button element for error messages
   */
  private createButton(
    text: string,
    onClick: () => void,
    isClose: boolean = false,
  ): HTMLElement {
    const button = document.createElement("button");
    button.textContent = text;
    button.style.cssText = `
      background: ${isClose ? "transparent" : "rgba(255, 255, 255, 0.2)"};
      border: ${isClose ? "none" : "1px solid rgba(255, 255, 255, 0.3)"};
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s ease;
    `;

    button.addEventListener("click", onClick);

    // Add hover effect
    button.addEventListener("mouseenter", () => {
      button.style.background = isClose
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(255, 255, 255, 0.3)";
    });

    button.addEventListener("mouseleave", () => {
      button.style.background = isClose
        ? "transparent"
        : "rgba(255, 255, 255, 0.2)";
    });

    return button;
  }

  /**
   * Gets background color for error type
   */
  private getErrorBackground(type: string): string {
    switch (type) {
      case "error":
        return "linear-gradient(135deg, #ef4444, #dc2626)";
      case "warning":
        return "linear-gradient(135deg, #f59e0b, #d97706)";
      case "info":
        return "linear-gradient(135deg, #3b82f6, #2563eb)";
      default:
        return "linear-gradient(135deg, #ef4444, #dc2626)";
    }
  }

  /**
   * Gets border color for error type
   */
  private getErrorBorder(type: string): string {
    switch (type) {
      case "error":
        return "#dc2626";
      case "warning":
        return "#d97706";
      case "info":
        return "#2563eb";
      default:
        return "#dc2626";
    }
  }

  /**
   * Removes an error message
   */
  private removeError(errorId: string): void {
    const errorElement = this.activeErrors.get(errorId);
    if (!errorElement) return;

    // Add exit animation
    errorElement.style.transform = "translateY(-20px)";
    errorElement.style.opacity = "0";

    setTimeout(() => {
      errorElement.remove();
      this.activeErrors.delete(errorId);
    }, 300);
  }

  /**
   * Clears all active error messages
   */
  clearAllErrors(): void {
    this.activeErrors.forEach((_, errorId) => {
      this.removeError(errorId);
    });
  }

  /**
   * Logs an error for debugging
   */
  private logError(errorDetails: ErrorDetails): void {
    // Add to internal log
    this.errorLog.push(errorDetails);

    // Maintain log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Console logging with context
    console.error(`[${errorDetails.code}] ${errorDetails.message}`, {
      originalError: errorDetails.originalError,
      context: errorDetails.context,
      timestamp: errorDetails.timestamp,
    });

    // Send to external monitoring service (if available)
    this.reportError(errorDetails);
  }

  /**
   * Reports error to external monitoring service
   */
  private reportError(errorDetails: ErrorDetails): void {
    // This could be extended to send to services like Sentry, LogRocket, etc.
    // For now, just structured logging
    // Send to external monitoring service (if available)
    if ((window as any).gtag) {
      // Send to Google Analytics if available
      (window as any).gtag("event", "exception", {
        description: `${errorDetails.code}: ${errorDetails.message}`,
        fatal: false,
      });
    }
  }

  /**
   * Gets the error log for debugging
   */
  getErrorLog(): ErrorDetails[] {
    return [...this.errorLog];
  }

  /**
   * Exports error log as text for support
   */
  exportErrorLog(): string {
    return this.errorLog
      .map((error) => {
        return `[${error.timestamp.toISOString()}] ${error.code}: ${error.message}
  Original Error: ${error.originalError?.message || "N/A"}
  Context: ${JSON.stringify(error.context || {}, null, 2)}
  ---`;
      })
      .join("\n");
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    this.clearAllErrors();
    if (this.errorContainer) {
      this.errorContainer.remove();
      this.errorContainer = null;
    }
    this.errorLog = [];
  }
}

// Global error handler for unhandled errors
export function setupGlobalErrorHandler(errorHandler: ErrorHandler): void {
  window.addEventListener("error", (event) => {
    errorHandler.handleGeneralError(event.error, "Global error handler");
  });

  window.addEventListener("unhandledrejection", (event) => {
    errorHandler.handleGeneralError(
      new Error(event.reason),
      "Unhandled promise rejection",
    );
  });
}
