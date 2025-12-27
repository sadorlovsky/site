// Trip data structure
export interface TripDestination {
  city: string;
  country?: string;
}

export interface Trip {
  date: string;
  destination?: TripDestination[];
}

// GeoJSON structure
export interface CityProperties {
  name: string;
  code: string;
  country: string;
}

export interface CityGeometry {
  coordinates: [number, number];
  type: "Point";
}

export interface CityFeature {
  geometry: CityGeometry;
  properties: CityProperties;
  type: "Feature";
}

export interface CitiesGeoJSON {
  type: "FeatureCollection";
  features: CityFeature[];
}

// Map and UI structures
export interface CityLabelData {
  element: HTMLElement;
  coordinates: [number, number];
}

export interface MarkerData {
  element: HTMLElement;
  labelElement: HTMLElement;
  coordinates: [number, number];
  marker: any; // MapLibre Marker type
}

// Configuration constants
export interface MapConfig {
  readonly MOBILE_BREAKPOINT: number;
  readonly ZOOM_LEVELS: {
    readonly mobile: number;
    readonly desktop: number;
  };
  readonly TIMEOUTS: {
    readonly MAP_RESIZE: number;
    readonly MAP_RESIZE_ADDITIONAL: number;
    readonly PREVENT_CLICK: number;
    readonly ERROR_DISPLAY: number;
    readonly IOS_ORIENTATION_CHANGE: number;
    readonly IOS_VISIBILITY_CHANGE: number;
    readonly IOS_PAGE_SHOW: number;
  };
  readonly LABEL_OFFSET: number;
  readonly STORAGE_KEY: string;
}

// Error types
export class MapError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = "MapError";
  }
}

export class DataLoadError extends MapError {
  constructor(
    message: string,
    public statusCode?: number,
    cause?: Error,
  ) {
    super(message, cause);
    this.name = "DataLoadError";
  }
}

// Color scheme type
export type ColorScheme = "dark" | "light";

// Event handler types
export type MarkerInteractionHandler = (event: Event) => void;
export type ToggleChangeHandler = (checked: boolean) => void;

// Map layer types
export interface LayerLayout {
  visibility: "visible" | "none";
}

export interface FillPaint {
  "fill-color": string | any[]; // Can be a color string or MapLibre expression
}

export interface BackgroundPaint {
  "background-color": string;
}

export interface FillLayer {
  id: string;
  type: "fill";
  paint: FillPaint;
  filter?: any[];
  layout?: LayerLayout;
  source: string;
  maxzoom?: number;
  "source-layer"?: string;
}

export interface BackgroundLayer {
  id: string;
  type: "background";
  paint: BackgroundPaint;
  filter?: any[];
  layout?: LayerLayout;
  maxzoom?: number;
}

export type MapLayer = FillLayer | BackgroundLayer;

// Map initialization types
export interface MapInitOptions {
  containerId: string;
  styleUrl: string;
  center: [number, number];
  zoom: number;
  attributionControl: boolean;
}
