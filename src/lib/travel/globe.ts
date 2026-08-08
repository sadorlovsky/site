/**
 * The geometry behind the travel map's globe: how big the sphere is drawn, what
 * zoom draws it that big, and which half of it faces the viewer.
 *
 * Split out of the map client because every function here is arithmetic over
 * numbers — no MapLibre instance, no DOM — and that is exactly the part worth
 * pinning down in a test. The client keeps whatever needs the live map: reading
 * --globe-size off the container, and asking the projection whether it is
 * currently a globe at all.
 */

// MapLibre's rendered globe is ≈ 512 * 2^zoom / GLOBE_SCALE_FACTOR pixels
// across, so zoom = log2(diameter * GLOBE_SCALE_FACTOR / 512).
//
// The factor is measured, not derived. It was 2.7, which asked for a diameter
// and got about 97% of it — invisible while the container had 50px of padding
// to hide the shortfall, and plain once the container became the globe. Read
// off the rendered sphere's width at its widest point at three container
// sizes: 480→466, 440→428, 280→272, all landing within 0.002 of the same
// ratio.
export const GLOBE_SCALE_FACTOR = 2.78;

export function getZoomForGlobe(diameter: number): number {
  return Math.log2((diameter * GLOBE_SCALE_FACTOR) / 512);
}

/**
 * Mercator's scale factor at a latitude, in zoom levels.
 *
 * Under the globe projection getZoom()/setZoom() speak in mercator-equivalent
 * units for the centre's latitude, while the transform — and with it the size
 * the sphere is drawn at — does not. The two differ by exactly this: 0.64 zoom
 * levels at 50°N, 2.5 at 80°N. Anything comparing a zoom against a size has to
 * account for it, or it holds at one latitude and drifts everywhere else.
 */
export function latitudeZoomOffset(latitude: number): number {
  return Math.log2(1 / Math.cos((latitude * Math.PI) / 180));
}

/**
 * The floor to hand to setMinZoom so gestures can enlarge the globe but never
 * shrink it below `diameter` on screen.
 *
 * minZoom is compared against the transform's zoom, so the offset above has to
 * be added to a value that came from getZoomForGlobe. Measured: a floor of
 * 1.382 let the sphere shrink to a reported 0.745, while 1.382 + 0.637 stops it
 * at exactly 1.382.
 *
 * Apply it only once the globe projection is active. In the constructor, where
 * the map is still mercator, the same number clamps the opening view instead
 * and the globe starts half again too large.
 */
export function getGlobeZoomFloor(diameter: number, latitude: number): number {
  return getZoomForGlobe(diameter) + latitudeZoomOffset(latitude);
}

/**
 * Zoom at which the sphere reaches into the container's corners — the point
 * where the map has filled its frame and a border stops being a box drawn
 * around empty space. Derived from the container's diagonal with the same
 * empirical scale factor as above, rather than a number picked by eye, so it
 * follows the viewport instead of being right at one width only. The 0.9 gives
 * it a little lead: the frame should be there as the corners fill, not after.
 */
export function getZoomForFullFrame(
  containerWidth: number,
  containerHeight: number,
): number {
  const diagonal = Math.hypot(containerWidth, containerHeight) * 0.9;
  return Math.log2((diagonal * GLOBE_SCALE_FACTOR) / 512);
}

/**
 * Whether a coordinate lies on the half of the globe turned towards the viewer,
 * given where the globe is centred.
 *
 * The globe hides half the world behind itself, but the cities back there are
 * still in the source and still project to a screen position — one that lands
 * inside the visible disc, near whichever limb they sit behind. A query near
 * the limb therefore reaches straight through the planet, which is how a cursor
 * at the edge of the Atlantic came back holding Krasnodar.
 *
 * The caller decides whether the question applies at all: a flat map has no far
 * side, so everything on it faces the camera.
 */
export function facesCamera(
  lngLat: [number, number],
  centre: { lng: number; lat: number },
): boolean {
  const toRadians = Math.PI / 180;
  const centreLat = centre.lat * toRadians;
  const pointLat = lngLat[1] * toRadians;
  const deltaLng = (lngLat[0] - centre.lng) * toRadians;
  // Cosine of the angle between the two points' surface normals: positive on
  // the hemisphere facing the camera, negative on the one facing away. The
  // real horizon of a perspective camera falls a little short of ninety
  // degrees, so a sliver at the very edge stays hoverable — which is the
  // forgiving side to err on for something you are trying to point at.
  return (
    Math.sin(centreLat) * Math.sin(pointLat) +
      Math.cos(centreLat) * Math.cos(pointLat) * Math.cos(deltaLng) >
    0
  );
}
