import { expect, test } from "vitest";
import {
  facesCamera,
  getGlobeZoomFloor,
  getZoomForFullFrame,
  getZoomForGlobe,
  latitudeZoomOffset,
} from "./globe";

// The numbers these lock in are the measured ones the module's comments cite,
// so a change to GLOBE_SCALE_FACTOR has to be a deliberate one.
test("asks for the zoom that draws the globe at a given diameter", () => {
  expect(getZoomForGlobe(480)).toBeCloseTo(1.382, 3);
  expect(getZoomForGlobe(280)).toBeCloseTo(0.604, 3);
});

test("doubling the diameter costs exactly one zoom level", () => {
  expect(getZoomForGlobe(560) - getZoomForGlobe(280)).toBeCloseTo(1, 10);
});

test("restates mercator's scale factor at a latitude in zoom levels", () => {
  expect(latitudeZoomOffset(0)).toBeCloseTo(0, 10);
  expect(latitudeZoomOffset(50)).toBeCloseTo(0.638, 3);
  expect(latitudeZoomOffset(80)).toBeCloseTo(2.526, 3);
});

test("the equator needs no correction, and the offset grows with latitude", () => {
  expect(latitudeZoomOffset(20)).toBeGreaterThan(latitudeZoomOffset(0));
  expect(latitudeZoomOffset(60)).toBeGreaterThan(latitudeZoomOffset(20));
  // Symmetric: the southern hemisphere is drawn at the same scale.
  expect(latitudeZoomOffset(-50)).toBeCloseTo(latitudeZoomOffset(50), 10);
});

// The floor sits above the opening zoom by exactly the latitude offset — the
// distinction the map client's constructor comment turns on.
test("puts the globe's zoom floor above the zoom that opens it", () => {
  expect(getGlobeZoomFloor(480, 50)).toBeCloseTo(1.382 + 0.638, 3);
  expect(getGlobeZoomFloor(480, 50)).toBeGreaterThan(getZoomForGlobe(480));
});

test("fills the frame later than it draws the globe", () => {
  // The sphere reaches the corners of its container only after it has been
  // enlarged past the zoom that fits it edge to edge.
  expect(getZoomForFullFrame(480, 480)).toBeGreaterThan(getZoomForGlobe(480));
});

test("counts a point at the centre of the globe as facing the camera", () => {
  expect(facesCamera([0, 0], { lng: 0, lat: 0 })).toBe(true);
  expect(facesCamera([30, 45], { lng: 30, lat: 45 })).toBe(true);
});

// Either side of the horizon, not the horizon itself: at exactly ninety
// degrees the dot product is Math.cos(Math.PI / 2), which is 6.1e-17 rather
// than zero, so the boundary case is decided by float representation and not
// by anything worth asserting.
test("puts the horizon at ninety degrees from the centre", () => {
  expect(facesCamera([89.9, 0], { lng: 0, lat: 0 })).toBe(true);
  expect(facesCamera([90.1, 0], { lng: 0, lat: 0 })).toBe(false);
});

test("hides the antipode behind the planet", () => {
  expect(facesCamera([180, 0], { lng: 0, lat: 0 })).toBe(false);
  expect(facesCamera([-180, 0], { lng: 0, lat: 0 })).toBe(false);
});

// The failure this guard exists for: a cursor near the limb used to come back
// holding a city on the far side of the planet.
test("hides Krasnodar when the globe has turned away from it", () => {
  const krasnodar: [number, number] = [38.98, 45.04];
  expect(facesCamera(krasnodar, { lng: -140, lat: -20 })).toBe(false);
  expect(facesCamera(krasnodar, { lng: -10, lat: 50 })).toBe(true);
});
