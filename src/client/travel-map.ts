import { Map as MapLibre } from "maplibre-gl";
import type {
  FilterSpecification,
  GeoJSONSource,
  LayerSpecification,
} from "maplibre-gl";
import type { Feature, Point } from "geojson";
import { countries, cities, cityCoordinates } from "@lib/travel";
import { getCityName } from "@lib/travel/cities-i18n";
import crimeaGeoJson from "@lib/travel/crimea.geo.json";

const MOBILE_BREAKPOINT = 480;
/** How close a city label may come to the window's edge before it stops. */
const VIEWPORT_EDGE_GAP = 8;
/** How far from a city's centre the cursor still counts as pointing at it. */
const HOVER_RADIUS = 14;
/** Latitude the globe opens on — also what its zoom floor is measured from. */
const GLOBE_LATITUDE = 50;
const VISITED_COLOR = "#ed6292";
// City markers adapt to the colour scheme: the bead's body is white on the dark
// map and a deep accent on the light one, where white would have almost no
// contrast over the pink countries. The halo underneath uses the site accent in
// both. The rim and the highlight don't change — light striking a piece of
// glass doesn't take the colour of the page it's on.
const CITY_BODY_DARK = "#ffffff";
const CITY_BODY_LIGHT = "#b81f54";
const CITY_GLOW_DARK = "#ed6292";
const CITY_GLOW_LIGHT = "#a01848";
const CITY_RIM = "#ffffff";
const BORDER_COLOR = "#c74b7a";
const LIGHT_BG = "#f8f8ff";
const DARK_BG = "#191919";
const LIGHT_WATER = "#cad8e6";
const DARK_WATER = "#2a3a4a";
const LIGHT_TEXT = "#333333";
const DARK_TEXT = "#e0e0e0";
// How long the loading shimmer may stay up before it is lifted regardless.
const PLACEHOLDER_TIMEOUT_MS = 4000;

/** Values for the four zoom stops every city-marker layer interpolates over. */
type MarkerStops = [number, number, number, number];

/** Whatever MapLibre accepts for a numeric circle paint property. */
type CircleNumberValue = NonNullable<
  NonNullable<
    Extract<LayerSpecification, { type: "circle" }>["paint"]
  >["circle-radius"]
>;

/**
 * A marker paint value that grows over zoom, optionally taking a second set of
 * values while the city is hovered.
 *
 * Every layer of the bead shares these stops — the globe, where a city is a
 * plain dot, and the zoomed-in map, where it is glass — so the parts can never
 * arrive on different schedules and leave a rim floating around a dot half its
 * size. The cast is the one the shape needs: MapLibre types these as a union of
 * literal expression forms, which an array built at runtime can't satisfy.
 */
function markerScale(
  rest: MarkerStops,
  hover?: MarkerStops,
): CircleNumberValue {
  const at = (i: number) =>
    hover
      ? ["case", ["boolean", ["feature-state", "hover"], false], hover[i], rest[i]]
      : rest[i];

  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    1,
    at(0),
    3,
    at(1),
    5,
    at(2),
    8,
    at(3),
  ] as unknown as CircleNumberValue;
}

/**
 * The bead's geometry, named because the clusters are built from the same
 * numbers.
 *
 * A cluster is not a second kind of marker with dimensions of its own — it is
 * this bead, scaled by how much it carries — so each of these arrays is read
 * twice: once by the layer that draws a lone city and once by the layer that
 * draws a group of them. Left as literals in both places, a bead redrawn on one
 * side would quietly leave the clusters wearing its old proportions.
 */
const BEAD_RADIUS: MarkerStops = [3, 5.5, 9, 9];
const BEAD_RADIUS_HOVER: MarkerStops = [3.4, 6.2, 10, 10];
const GLOW_RADIUS: MarkerStops = [6, 11, 18, 18];
const GLOW_RADIUS_HOVER: MarkerStops = [10, 16, 26, 26];
const SPECULAR_RADIUS: MarkerStops = [0, 1.9, 3.2, 3.2];
const SPECULAR_RADIUS_HOVER: MarkerStops = [0, 2.2, 3.6, 3.6];
/**
 * The rim's width — the one part of the bead a cluster does not scale. A rim is
 * the light caught along an edge, and an edge does not thicken because the thing
 * behind it got bigger; scaled with the count it stopped reading as glass and
 * started reading as a pie chart with a fat white border.
 */
const RIM_WIDTH: MarkerStops = [0, 0.9, 1.3, 1.3];

/**
 * The opacity curves of the four marker layers, named once.
 *
 * These are the only marker values with two homes: the layer definitions below
 * and applyCityTransparency, which restores them when someone turns reduced
 * transparency back off. That branch runs on a system-settings toggle and
 * nowhere else, so a literal drifting out of sync with its twin would go
 * unnoticed in every ordinary pass over the page — which is the same reason
 * markerScale exists one level down.
 *
 * The cluster layers share these curves rather than declaring hover-free twins.
 * The hover branch is dead weight there — feature-state is never written for a
 * cluster, so it always resolves to the resting value — but one shared curve is
 * worth more than a saved comparison: it makes it impossible for a group of
 * cities to end up more or less solid than a city standing on its own.
 */
const MARKER_BODY_OPACITY = markerScale(
  [0.95, 0.78, 0.52, 0.52],
  [1, 0.9, 0.68, 0.68],
);
const MARKER_RIM_OPACITY = markerScale([0, 0.5, 0.8, 0.8], [0, 0.95, 1, 1]);
const MARKER_SPECULAR_OPACITY = markerScale(
  [0, 0.45, 0.62, 0.62],
  [0, 0.7, 0.85, 0.85],
);
const MARKER_SHADOW_OPACITY = markerScale([0, 0.18, 0.3, 0.3]);

/**
 * The two that survive prefers-reduced-transparency, since the highlight and
 * the shadow simply go to zero there and need no curve.
 *
 * The body turns solid. The rim stays — it is the bead's edge, not a surface
 * laid over content — but at full strength from the first zoom stop that can
 * hold it, so it has no hover pair: there is nothing left to brighten.
 */
const MARKER_BODY_OPACITY_REDUCED = 1;
const MARKER_RIM_OPACITY_REDUCED = markerScale([0, 1, 1, 1]);

/**
 * How close two markers have to come before they are merged into one.
 *
 * A bead's diameter, derived rather than chosen, so "touching" goes on meaning
 * touching after the bead is next resized. Deliberately not the glow's
 * diameter: the glow is soft, blurred and translucent, and two of them
 * overlapping read as two cities near each other — which is what they are.
 * Measured off the glow instead, half of Europe collapses into one dot while
 * there is still clear daylight between the beads it swallowed.
 */
const CLUSTER_RADIUS_PX = BEAD_RADIUS[2] * 2;

/**
 * Past here every city stands alone. By this zoom even neighbours a few
 * kilometres apart have visible space between them, and a group still holding
 * out that far in is hiding exactly the cities the reader zoomed in to find.
 */
const CLUSTER_MAX_ZOOM = 9;

/**
 * How much bigger a cluster is drawn than the bead it is made of.
 *
 * Driven by the square root of the count, so the painted *area* — which is what
 * the eye weighs — tracks how many cities the marker stands for. Straight
 * linear growth makes a group of forty ten times the mark a group of four is,
 * and the map turns into a handful of blots surrounded by specks.
 *
 * The stops flatten off above ten because even a square root eventually outruns
 * the map: a beacon the size of a country has stopped being a marker for the
 * cities under it and started being a region of its own.
 */
const CLUSTER_COUNT_SCALE: unknown[] = [
  "interpolate",
  ["linear"],
  ["sqrt", ["get", "point_count"]],
  Math.sqrt(2),
  1.5,
  Math.sqrt(10),
  2.4,
  Math.sqrt(50),
  3.4,
];

/**
 * A bead measurement restated for a cluster: the same zoom curve, every stop
 * multiplied by the count scale.
 *
 * The multiplication happens inside each stop rather than around the finished
 * interpolation because a zoom expression has to be the outermost thing in a
 * paint value — wrapping it in a `*` buries it, and MapLibre rejects the layer
 * outright.
 */
function clusterScale(rest: MarkerStops): CircleNumberValue {
  const at = (i: number) => ["*", rest[i], CLUSTER_COUNT_SCALE];

  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    1,
    at(0),
    3,
    at(1),
    5,
    at(2),
    8,
    at(3),
  ] as unknown as CircleNumberValue;
}

/** Russian plural for a count: 1 город, 2 города, 5 городов. */
function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** What a cluster calls itself: the count and the word for what it holds. */
function formatClusterLabel(count: number, lang: "en" | "ru"): string {
  return lang === "en"
    ? `${count} ${count === 1 ? "city" : "cities"}`
    : `${count} ${plural(count, "город", "города", "городов")}`;
}

/**
 * The globe's diameter, in pixels, as chosen by the stylesheet (--globe-size on
 * .map). The container's height is that plus a gap above and below, so reading
 * it here keeps one number in one place instead of a padding constant on this
 * side and a fixed height on the other, each implying a different globe.
 */
function getGlobeSize(container: HTMLElement): number {
  const declared = parseFloat(
    getComputedStyle(container).getPropertyValue("--globe-size"),
  );
  if (Number.isFinite(declared) && declared > 0) return declared;
  // No custom property (a container styled elsewhere): fall back to fitting the
  // sphere into whichever way the box is tighter.
  return Math.min(container.clientWidth, container.clientHeight);
}

// MapLibre's rendered globe is ≈ 512 * 2^zoom / GLOBE_SCALE_FACTOR pixels
// across, so zoom = log2(diameter * GLOBE_SCALE_FACTOR / 512).
//
// The factor is measured, not derived. It was 2.7, which asked for a diameter
// and got about 97% of it — invisible while the container had 50px of padding
// to hide the shortfall, and plain once the container became the globe. Read
// off the rendered sphere's width at its widest point at three container
// sizes: 480→466, 440→428, 280→272, all landing within 0.002 of the same
// ratio.
const GLOBE_SCALE_FACTOR = 2.78;

function getZoomForGlobe(diameter: number): number {
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
function latitudeZoomOffset(latitude: number): number {
  return Math.log2(1 / Math.cos((latitude * Math.PI) / 180));
}

/**
 * The reported zoom, restated in the units the sphere's size was measured in —
 * those of GLOBE_LATITUDE — so a threshold in those units means the same thing
 * wherever the globe has been dragged to. At GLOBE_LATITUDE it changes nothing.
 */
function sizeZoom(map: MapLibre): number {
  return (
    map.getZoom() +
    latitudeZoomOffset(map.getCenter().lat) -
    latitudeZoomOffset(GLOBE_LATITUDE)
  );
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
function getGlobeZoomFloor(diameter: number, latitude: number): number {
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
function getZoomForFullFrame(
  containerWidth: number,
  containerHeight: number,
): number {
  const diagonal = Math.hypot(containerWidth, containerHeight) * 0.9;
  return Math.log2((diagonal * GLOBE_SCALE_FACTOR) / 512);
}

async function initMap(): Promise<void> {
  const container = document.getElementById("map")!;
  if (!container) return;

  const mode = (container.dataset.mode || "normal") as "normal" | "globe";
  const isGlobe = mode === "globe";
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

  // For globe mode, calculate zoom to fit globe in container with padding
  const getInitialZoom = (): number => {
    if (isGlobe) {
      return getZoomForGlobe(getGlobeSize(container));
    }
    return isMobile ? 1 : 2;
  };

  // For globe mode, start further west so rotation immediately shows Western Europe
  const initialCenter: [number, number] = isGlobe
    ? [-10, GLOBE_LATITUDE]
    : [43, 55];

  const initialZoom = getInitialZoom();

  const map = new MapLibre({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/positron",
    center: initialCenter,
    zoom: initialZoom,
    // Never above the zoom the opening view asks for. A globe on a narrow
    // viewport is drawn well below 1 — 280px of sphere wants 0.604 — and a flat
    // floor of 1 clamped it, leaving the resize observer to correct a view that
    // was never painted. The correction is a real camera write, and everything
    // downstream then has to tell it apart from a real gesture. Cheaper not to
    // create it. This is not the globe's floor: that one is above the opening
    // zoom by the latitude offset, and setting it here would clamp in the other
    // direction. It goes on once the style is up and the projection is actually
    // globe.
    minZoom: isGlobe ? Math.min(1, initialZoom) : 1,
    attributionControl: false,
  });

  // `load` does not fire until the first *visually complete* render, which in
  // turn waits on every tile in view — and the planet tiles run to megabytes
  // each at low zoom. Blocking setup on it means that on a slow link the layers
  // below are never even added. `style.load` is all this code actually needs:
  // the style's own layers exist from that point on, and tiles can keep
  // arriving afterwards.
  if (!map.isStyleLoaded()) {
    await new Promise<void>((resolve) =>
      map.once("style.load", () => resolve()),
    );
  }

  function setProjectionMode(mode: "globe" | "normal") {
    if (mode === "globe") {
      map.setProjection({ type: "globe" });
      const newZoom = getZoomForGlobe(getGlobeSize(container));
      map.setZoom(newZoom);
      map.setMinZoom(
        getGlobeZoomFloor(getGlobeSize(container), GLOBE_LATITUDE),
      );
    } else {
      // A flat map has no globe to turn, and the rotation would keep panning it
      // east forever. takeOver rather than a pause: a pause alone leaves the
      // intersection observer free to start it again the next time the map
      // scrolls back into view.
      takeOver();
      map.setProjection({ type: "mercator" });
      map.setMinZoom(1);
      map.setZoom(isMobile ? 1 : 2);
    }
  }

  // Expose for external use: window.setMapMode("globe") or window.setMapMode("normal")
  (window as unknown as { setMapMode: typeof setProjectionMode }).setMapMode =
    setProjectionMode;

  // Auto-rotation for globe mode. The rAF loop must not run when there is
  // nothing to see: off-screen (scrolled away), on a hidden tab, or when the
  // user prefers reduced motion. Otherwise it repaints the WebGL globe every
  // frame forever — a needless CPU/GPU/battery drain on a page the map only
  // occupies the top of.
  //
  // The controls live out here, above the touch arbiter and flyToCity, because
  // both of them have a verdict to report and neither can reach inside the
  // `if (isGlobe)` block below. `shouldRotate` asks for isGlobe itself, so on a
  // mercator map every one of these is a no-op that costs a comparison.
  const rotationSpeed = 0.15; // degrees per frame
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  let userStopped = false; // user took control → never auto-resume
  let inViewport = true; // map container intersects the viewport
  let rafId: number | null = null;

  const shouldRotate = () =>
    isGlobe &&
    !userStopped &&
    !prefersReducedMotion &&
    inViewport &&
    !document.hidden;

  function rotate() {
    if (!shouldRotate()) {
      rafId = null;
      return;
    }
    const center = map.getCenter();
    center.lng += rotationSpeed;
    map.setCenter(center);
    rafId = requestAnimationFrame(rotate);
  }

  function startRotation() {
    if (rafId === null && shouldRotate()) {
      rafId = requestAnimationFrame(rotate);
    }
  }

  function pauseRotation() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // The permanent stop. Everything that resumes rotation runs through
  // startRotation, which asks shouldRotate first, so this is one-way.
  function takeOver() {
    userStopped = true;
    pauseRotation();
  }

  // The globe fills most of the first screen, so a page that let it eat every
  // scroll would be a page you couldn't leave with the cursor where it lands.
  //
  // Plain wheel and two-finger scroll therefore belong to the page. Zoom stays
  // on the pinch, which reaches the browser as a wheel event with ctrlKey set
  // by the operating system — the gesture people already use to zoom a map, and
  // nothing anyone has to hold down. Stopping the event here in the capture
  // phase means MapLibre's own handler, which sits on a descendant, never runs
  // and never calls preventDefault, so the page scrolls exactly as it would
  // over any other element.
  container.addEventListener(
    "wheel",
    (event) => {
      if (!event.ctrlKey) event.stopPropagation();
    },
    { capture: true },
  );

  // Touch is split by direction rather than by finger count: sideways turns the
  // globe, up and down scrolls the page. Both of the earlier attempts here
  // counted fingers instead — dragPan off entirely, then cooperative gestures'
  // two-finger minimum — and a count is the wrong thing to split on when the
  // globe turns one way and the page scrolls the other. It also meant the one
  // gesture people actually reach for, a thumb across the globe, was the one
  // that did nothing.
  //
  // The `touch-action: pan-y` in TravelMap.astro states the split but cannot
  // enforce it alone: it only makes the browser *willing* to scroll a vertical
  // drag, and MapLibre calls preventDefault on the first touchmove it sees,
  // which cancels that scroll before it can start. Measured — a vertical
  // one-finger drag moved the map 36.7° of latitude and left the page where it
  // was.
  //
  // So the gesture is arbitrated here, in the capture phase, above the canvas
  // MapLibre listens on. Nothing is forwarded while the direction is still in
  // doubt, and a drag ruled vertical stays blocked for its whole life: MapLibre
  // never sees it, never preventDefaults it, and the page scrolls natively —
  // with the inertia and rubber-banding that only the browser can give.
  //
  // Two fingers are never arbitrated. Pinch, rotate and two-finger pan all
  // belong to the map, and the second finger is unambiguous about that.
  const DIRECTION_THRESHOLD = 6; // px of travel before the axis is called
  let gestureOwner: "undecided" | "map" | "page" = "undecided";
  let gestureStart: { x: number; y: number } | null = null;

  // The arbiter also speaks for the rotation, because the rotation and a touch
  // gesture cannot both be in progress: the rotation turns the globe with
  // setCenter, setCenter goes through jumpTo, and jumpTo stops every handler
  // MapLibre has in flight. A finger racing that loop has its pan reset sixty
  // times a second — and once reset between touchstart and the first move, the
  // handler stays inactive for the rest of the gesture, so the globe cannot be
  // dragged at all while it is turning. A mouse never meets this: mousedown
  // stops the rotation before the drag begins. Touch had the same guard on
  // touchstart until it was dropped, for the good reason that a finger on its
  // way down the page is not someone taking the globe over.
  //
  // Both wants fit if a landing finger only *pauses* the spin, and the verdict
  // decides what happens next: a gesture the map ends up owning has taken the
  // globe over and stops it for good, while one ruled vertical, or a touch that
  // ends without ever moving, hands it straight back.
  //
  // The pause lasts the whole touch, not a fixed window. Usually that is the
  // moment or two before the axis declares itself; a finger that lands and does
  // not move holds the spin until it lifts, deliberately — resuming underneath a
  // finger that is still down would go back to resetting MapLibre's handlers
  // mid-gesture, which is the exact failure this arrangement exists to avoid.

  container.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length > 1) {
        // Two fingers are the map's, but landing is not yet taking over: a
        // two-finger tap, or a second finger that arrives and lifts without
        // moving, should leave the globe turning. The first move claims it.
        gestureOwner = "map";
        pauseRotation();
        return;
      }
      gestureOwner = "undecided";
      gestureStart = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
      pauseRotation();
    },
    { capture: true },
  );

  container.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length > 1) gestureOwner = "map";

      // One place for every way the map ends up owning the gesture — a second
      // finger, or an axis already ruled sideways — so movement under the map's
      // ownership is what claims the globe, never the touch that started it.
      if (gestureOwner === "map") {
        takeOver();
        return;
      }

      if (gestureOwner === "undecided" && gestureStart) {
        const dx = event.touches[0].clientX - gestureStart.x;
        const dy = event.touches[0].clientY - gestureStart.y;
        if (Math.hypot(dx, dy) >= DIRECTION_THRESHOLD) {
          gestureOwner = Math.abs(dx) > Math.abs(dy) ? "map" : "page";
          if (gestureOwner === "map") {
            takeOver();
            return;
          }
          startRotation();
        }
      }

      event.stopPropagation();
    },
    { capture: true },
  );

  // Only a gesture that ends releases the verdict. Lifting one finger of a
  // pinch leaves the map holding what is left, rather than putting the survivor
  // back through a decision it would have to restart from a stale origin.
  const releaseGesture = (event: TouchEvent) => {
    if (event.touches.length > 0) return;
    // A gesture that ended without ever claiming the globe gets the spin back —
    // a tap, a two-finger tap, a drag ruled vertical. Asking startRotation
    // rather than reading gestureOwner is what makes that list complete: it
    // answers "was the globe taken over", which is the actual question, and a
    // two-finger tap ends with gestureOwner already "map" while having taken
    // nothing over. Once takeOver has run this is a no-op.
    startRotation();
    gestureOwner = "undecided";
    gestureStart = null;
  };
  container.addEventListener("touchend", releaseGesture, { capture: true });
  container.addEventListener("touchcancel", releaseGesture, { capture: true });

  // The frame only earns its place once the map fills it. Around the globe it
  // would be drawing a box around mostly empty space — a sphere in a 2.7:1
  // container leaves the majority of the frame dark — while zoomed in the map
  // runs edge to edge and the border reads as a window onto it. The threshold
  // is cached rather than measured per zoom event, since reading the
  // container's size on every frame of a pinch would cost a layout each time.
  let frameFromZoom = getZoomForFullFrame(
    container.clientWidth,
    container.clientHeight,
  );
  const syncFrame = () => {
    // Compared in size units, not reported ones: dragging to a pole shifts the
    // reported zoom by two and a half levels without changing how big anything
    // is drawn, and the frame used to wait that much longer to appear there.
    const zoom = isGlobe ? sizeZoom(map) : map.getZoom();
    container.classList.toggle("is-framed", zoom >= frameFromZoom);
  };
  map.on("zoom", syncFrame);
  // Latitude changes what the reported zoom means, so panning matters too.
  map.on("move", syncFrame);
  syncFrame();

  if (isGlobe) {
    map.setProjection({ type: "globe" });
    map.setMinZoom(getGlobeZoomFloor(getGlobeSize(container), GLOBE_LATITUDE));

    // Recalculate zoom on container resize
    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width === 0 || height === 0) return;
      // A resized container gives the globe a new size, and that size is also
      // the new floor. The floor has to move first: it *is* the zoom that draws
      // the globe at the old diameter, so on a shrink it would clamp the very
      // setZoom meant to shrink the globe, and the sphere would stay at its
      // wide-viewport size and spill out of the narrower frame.
      map.setMinZoom(
        getGlobeZoomFloor(getGlobeSize(container), GLOBE_LATITUDE),
      );
      map.setZoom(getZoomForGlobe(getGlobeSize(container)));
      // It fills at a different zoom too.
      frameFromZoom = getZoomForFullFrame(width, height);
      syncFrame();
    });
    resizeObserver.observe(container);

    // Permanent stop once the user takes control of the globe — and only then.
    //
    // These events do not belong to gestures alone. MapLibre raises the same
    // zoomstart, dragstart and rotatestart for the page's own camera writes, and
    // one of ours used to land during startup on a narrow viewport: a flat
    // `minZoom: 1` in the constructor sat above the 0.604 a 280px globe is drawn
    // at, so the opening view was clamped to 1 and the resize observer put it
    // back a moment later. That correction is a real zoom change and fires a
    // real zoomstart, and the globe stopped dead before anyone had touched it. A
    // desktop globe wants zoom 1.382, above the floor, so nothing was clamped,
    // nothing corrected, and the spin survived — which was the whole shape of
    // the bug: every phone, no desktop. The constructor no longer clamps, and
    // this guard means no other programmatic write can do the same again.
    //
    // `originalEvent` is what tells the two apart. MapLibre's gesture handlers
    // pass the DOM event that caused the camera to move; a programmatic setZoom
    // has none to pass. Reading it here means "took control" is answered by the
    // user's own input rather than by whatever else moved the camera, so a
    // resize or a clamp can no longer be mistaken for it. Deliberate camera
    // moves are a different thing entirely and say so themselves: flyToCity and
    // setProjectionMode call takeOver directly, because a rotation left running
    // under a flyTo would abort it — every setCenter goes through jumpTo, and
    // jumpTo stops whatever animation is playing.
    const stopRotation = (event: { originalEvent?: unknown }) => {
      if (!event.originalEvent) return;
      takeOver();
    };

    map.on("mousedown", stopRotation);
    map.on("wheel", stopRotation);
    // Not "touchstart": a finger landing on the globe on its way to scrolling
    // the page is not someone taking the globe over, and it used to stop the
    // rotation for good. These three fire only once the map has actually been
    // given the gesture, which is the moment the user took control.
    map.on("dragstart", stopRotation);
    map.on("zoomstart", stopRotation);
    map.on("rotatestart", stopRotation);

    // Pause/resume (not a permanent stop) as the map scrolls in and out of view.
    const rotationObserver = new IntersectionObserver(
      (entries) => {
        inViewport = entries[0].isIntersecting;
        if (inViewport) startRotation();
        else pauseRotation();
      },
      { threshold: 0 },
    );
    rotationObserver.observe(container);

    // Same for tab visibility — a backgrounded tab throttles rAF anyway, but
    // this stops the work outright and resumes cleanly on return.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pauseRotation();
      else startRotation();
    });

    startRotation();
  }

  // Add countries source from MapLibre demo tiles
  map.addSource("countries", {
    type: "vector",
    url: "https://demotiles.maplibre.org/tiles/tiles.json",
  });

  // Style map based on color scheme
  const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function applyColorScheme(isDark: boolean): void {
    const bg = isDark ? DARK_BG : LIGHT_BG;
    map.setPaintProperty("background", "background-color", bg);
    map.setPaintProperty(
      "water",
      "fill-color",
      isDark ? DARK_WATER : LIGHT_WATER,
    );

    // Hide parks, forests, residential areas, buildings, and glaciers
    map.setPaintProperty("park", "fill-color", bg);
    map.setPaintProperty("landcover_wood", "fill-color", bg);
    map.setPaintProperty("landuse_residential", "fill-color", bg);
    map.setPaintProperty("building", "fill-color", bg);
    map.setPaintProperty("landcover_ice_shelf", "fill-color", bg);
    map.setPaintProperty("landcover_glacier", "fill-color", bg);

    // Hide roads and railways
    const roadLayers = [
      "highway_path",
      "highway_minor",
      "highway_major_casing",
      "highway_major_inner",
      "highway_major_subtle",
      "highway_motorway_casing",
      "highway_motorway_inner",
      "highway_motorway_subtle",
      "highway_motorway_bridge_casing",
      "highway_motorway_bridge_inner",
      "railway",
      "railway_dashline",
      "railway_transit",
      "railway_transit_dashline",
      "railway_service",
      "railway_service_dashline",
    ];
    for (const layer of roadLayers) {
      map.setPaintProperty(layer, "line-color", bg);
    }

    // Style labels
    const labelLayers = [
      "label_country_1",
      "label_country_2",
      "label_country_3",
      "label_city",
      "label_city_capital",
      "label_state",
      "label_town",
      "label_village",
      "label_other",
      "water_name_point_label",
      "water_name_line_label",
    ];

    const textColor = isDark ? DARK_TEXT : LIGHT_TEXT;
    for (const layer of labelLayers) {
      map.setLayoutProperty(layer, "visibility", "visible");
      map.setPaintProperty(layer, "text-color", textColor);
      map.setPaintProperty(layer, "text-halo-color", bg);
    }

    if (isGlobe) {
      // Hide all labels in globe mode
      for (const layer of labelLayers) {
        map.setLayoutProperty(layer, "visibility", "none");
      }
    }
  }

  applyColorScheme(colorSchemeQuery.matches);
  colorSchemeQuery.addEventListener("change", (e) =>
    applyColorScheme(e.matches),
  );

  // // Fade in country labels at higher zoom levels
  // const countryLabelLayers = [
  //   "label_country_1",
  //   "label_country_2",
  //   "label_country_3",
  // ];
  // for (const layer of countryLabelLayers) {
  //   map.setPaintProperty(layer, "text-opacity", [
  //     "interpolate",
  //     ["linear"],
  //     ["zoom"],
  //     3,
  //     0,
  //     5,
  //     1,
  //   ]);
  // }

  // // Fade in water labels at higher zoom levels
  // const waterLabelLayers = ["water_name_point_label", "water_name_line_label"];
  // for (const layer of waterLabelLayers) {
  //   map.setPaintProperty(layer, "text-opacity", [
  //     "interpolate",
  //     ["linear"],
  //     ["zoom"],
  //     3,
  //     0,
  //     5,
  //     1,
  //   ]);
  // }

  map.setPaintProperty("boundary_2", "line-color", BORDER_COLOR);

  // Add visited countries layer
  map.addLayer(
    {
      id: "visited-countries",
      type: "fill",
      source: "countries",
      "source-layer": "countries",
      paint: {
        "fill-color": VISITED_COLOR,
        "fill-opacity": 0.6,
      },
      filter: ["in", ["get", "ADM0_A3"], ["literal", Array.from(countries)]],
    },
    "boundary_2",
  );

  // Add Crimea exclusion layer (to hide it from visited countries)
  map.addSource("crimea", {
    type: "geojson",
    data: crimeaGeoJson as Feature,
  });

  const isDark = colorSchemeQuery.matches;
  map.addLayer(
    {
      id: "crimea-mask",
      type: "fill",
      source: "crimea",
      paint: {
        "fill-color": isDark ? DARK_BG : LIGHT_BG,
        "fill-opacity": 1,
      },
    },
    "boundary_2",
  );

  // Update crimea mask on color scheme change
  colorSchemeQuery.addEventListener("change", (e) => {
    map.setPaintProperty(
      "crimea-mask",
      "fill-color",
      e.matches ? DARK_BG : LIGHT_BG,
    );
  });

  // Ids are handed out so every city has one of its own for feature-state. They
  // survive clustering: supercluster copies the input feature's id onto the
  // point it emits, and numbers its own clusters from above the point count, so
  // a cluster id can never be mistaken for a city id.
  const cityFeatures = Array.from(cities)
    .filter((city) => cityCoordinates[city])
    .map((city, id) => ({
      type: "Feature" as const,
      id,
      geometry: {
        type: "Point" as const,
        coordinates: cityCoordinates[city],
      },
      properties: { name: city },
    }));

  map.addSource("visited-cities", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: cityFeatures,
    },
    cluster: true,
    clusterRadius: CLUSTER_RADIUS_PX,
    clusterMaxZoom: CLUSTER_MAX_ZOOM,
  });

  /** A city standing on its own rather than inside a group. */
  const SINGLES: FilterSpecification = ["!", ["has", "point_count"]];

  /** Everything that is a group rather than a city. */
  const CLUSTERS: FilterSpecification = ["has", "point_count"];

  /* ==========================================================================
     City markers — the chrome's liquid glass, transposed into circles.

     A WebGL circle has no gradient fill and no backdrop-filter, so glass can't
     be applied here the way .liquid-glass applies it to a pill. It has to be
     rebuilt from the parts the site's other capsules are made of: a tint the
     map shows through, a bright rim, a specular highlight in the top-left
     corner the whole design lights from, and a shadow saying the bead sits
     above the map rather than being printed on it. Four layers over one
     source, so a single hover feature-state lights all of them together.

     The material arrives with zoom. On the globe a city is three pixels
     across: a rim and a highlight are sub-pixel there, and a body wide enough
     to hold them turns Europe into a chain of touching beads. So the globe
     keeps the plain dot it always had, and the glass assembles itself as the
     map is zoomed in — every part of it is a paint property that interpolates
     over zoom anyway, so this costs a curve rather than a mechanism.

     Hover lights the rim instead of inflating the bead, which is how glass
     answers a cursor everywhere else on the site (--glass-rim-lit on the
     wishlist card and the condensed title). It also keeps neighbours from
     colliding in a dense cluster, where growth is exactly what makes them.

     None of these layers declares a paint transition, and none can: every
     value here is a zoom curve over a feature-state case, and MapLibre snaps
     data-driven properties to their new value rather than easing into it
     (properties.ts, "Transitions to data-driven properties are not
     supported"). The *-transition entries that used to sit beside them were
     doing nothing. Hover is instant, and the only way to change that is to
     stop driving these off feature-state.

     Both offset layers are anchored to the viewport. The default anchor is the
     map, which turns the offset with the bearing — and a light source that
     swings around as you rotate the globe is the one thing glass never does.
     ========================================================================== */

  // Drop shadow, offset down — the bead's contact with the map.
  map.addLayer(
    {
      id: "visited-cities-shadow",
      type: "circle",
      source: "visited-cities",
      filter: SINGLES,
      paint: {
        "circle-color": "#000000",
        "circle-blur": 0.9,
        "circle-translate": [0, 1.3],
        "circle-translate-anchor": "viewport",
        "circle-radius": markerScale(BEAD_RADIUS),
        "circle-opacity": MARKER_SHADOW_OPACITY,
      },
    },
    "label_other",
  );

  // Soft accent glow beneath each city — the "halo" of the beacon. Shares the
  // visited-cities source, so the hover feature-state lights up glow + body
  // together. Added before the body so it renders underneath it.
  map.addLayer(
    {
      id: "visited-cities-glow",
      type: "circle",
      source: "visited-cities",
      filter: SINGLES,
      paint: {
        "circle-color": CITY_GLOW_DARK,
        "circle-blur": 1,
        "circle-radius": markerScale(GLOW_RADIUS, GLOW_RADIUS_HOVER),
        "circle-opacity": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.6,
          0.32,
        ],
      },
    },
    "label_other",
  );

  // The body: a solid dot on the globe that thins into a tint you can read the
  // map through, wearing the rim as its stroke. Colour is set per colour-scheme
  // by applyCityColors below. Keeps the layer id — the hover hit test queries
  // it by name.
  map.addLayer(
    {
      id: "visited-cities",
      type: "circle",
      source: "visited-cities",
      filter: SINGLES,
      paint: {
        "circle-color": CITY_BODY_DARK,
        "circle-radius": markerScale(BEAD_RADIUS, BEAD_RADIUS_HOVER),
        "circle-blur": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0,
          0.08,
        ],
        "circle-opacity": MARKER_BODY_OPACITY,
        // The rim. White in both schemes: light striking a piece of glass
        // doesn't change colour with the page.
        "circle-stroke-width": markerScale(RIM_WIDTH),
        "circle-stroke-color": CITY_RIM,
        "circle-stroke-opacity": MARKER_RIM_OPACITY,
      },
    },
    "label_other",
  );

  // Specular highlight, offset toward the top-left — the same corner every
  // glass capsule on the site catches its light from.
  map.addLayer(
    {
      id: "visited-cities-specular",
      type: "circle",
      source: "visited-cities",
      filter: SINGLES,
      paint: {
        "circle-color": CITY_RIM,
        "circle-blur": 0.5,
        "circle-translate": [-1, -1.1],
        "circle-translate-anchor": "viewport",
        "circle-radius": markerScale(SPECULAR_RADIUS, SPECULAR_RADIUS_HOVER),
        "circle-opacity": MARKER_SPECULAR_OPACITY,
      },
    },
    "label_other",
  );

  /* ==========================================================================
     Clusters — the same bead, carrying more.

     Nothing new is invented for a group of cities. It gets the four layers a
     lone city gets, off the same stops and the same opacity curves, with every
     radius multiplied by the count scale, because the reader should not have to
     learn a second mark to understand that one beacon stands for six. What
     tells a cluster apart is that it is heavier, which is exactly what it is.

     Only the two offsets are constants rather than scaled values.
     circle-translate takes camera expressions but not data-driven ones, so the
     shadow cannot fall further and the highlight cannot ride further into the
     corner as the count grows. They are set once for a middling cluster, which
     leaves the largest ones lit a touch flatter than they would be if the
     property allowed it — a smaller error than dropping the depth entirely.

     There is no numeral drawn in the bead. The count is in the tooltip, and the
     size already says "several" everywhere the exact figure does not matter; a
     digit knocked into a nine-pixel circle at globe zoom says nothing at all.
     ========================================================================== */

  map.addLayer(
    {
      id: "visited-cities-cluster-shadow",
      type: "circle",
      source: "visited-cities",
      filter: CLUSTERS,
      paint: {
        "circle-color": "#000000",
        "circle-blur": 0.9,
        "circle-translate": [0, 2.2],
        "circle-translate-anchor": "viewport",
        "circle-radius": clusterScale(BEAD_RADIUS),
        "circle-opacity": MARKER_SHADOW_OPACITY,
      },
    },
    "label_other",
  );

  map.addLayer(
    {
      id: "visited-cities-cluster-glow",
      type: "circle",
      source: "visited-cities",
      filter: CLUSTERS,
      paint: {
        "circle-color": CITY_GLOW_DARK,
        "circle-blur": 1,
        "circle-radius": clusterScale(GLOW_RADIUS),
        "circle-opacity": 0.32,
      },
    },
    "label_other",
  );

  map.addLayer(
    {
      id: "visited-cities-cluster",
      type: "circle",
      source: "visited-cities",
      filter: CLUSTERS,
      paint: {
        "circle-color": CITY_BODY_DARK,
        "circle-radius": clusterScale(BEAD_RADIUS),
        "circle-blur": 0.08,
        "circle-opacity": MARKER_BODY_OPACITY,
        "circle-stroke-width": markerScale(RIM_WIDTH),
        "circle-stroke-color": CITY_RIM,
        "circle-stroke-opacity": MARKER_RIM_OPACITY,
      },
    },
    "label_other",
  );

  map.addLayer(
    {
      id: "visited-cities-cluster-specular",
      type: "circle",
      source: "visited-cities",
      filter: CLUSTERS,
      paint: {
        "circle-color": CITY_RIM,
        "circle-blur": 0.5,
        "circle-translate": [-2, -2.2],
        "circle-translate-anchor": "viewport",
        "circle-radius": clusterScale(SPECULAR_RADIUS),
        "circle-opacity": MARKER_SPECULAR_OPACITY,
      },
    },
    "label_other",
  );

  // A white body reads on the dark map; over the light map's pink countries it
  // has almost no contrast, so the tint goes to a deep accent there. The rim
  // and the highlight stay white either way — only the glass itself is tinted.
  function applyCityColors(isDark: boolean): void {
    if (!map.getLayer("visited-cities")) return;
    map.setPaintProperty(
      "visited-cities",
      "circle-color",
      isDark ? CITY_BODY_DARK : CITY_BODY_LIGHT,
    );
    // On the light map a same-hue glow washes out over the pink countries, so
    // the glow goes deeper and a touch stronger; the dark map keeps the airy
    // accent glow that already looks right.
    map.setPaintProperty(
      "visited-cities-glow",
      "circle-color",
      isDark ? CITY_GLOW_DARK : CITY_GLOW_LIGHT,
    );
    map.setPaintProperty("visited-cities-glow", "circle-opacity", [
      "case",
      ["boolean", ["feature-state", "hover"], false],
      isDark ? 0.6 : 0.65,
      isDark ? 0.32 : 0.45,
    ]);

    // Clusters take the bead's colours, since they are the bead. The glow's
    // resting strength is lifted on the light map for the same reason the
    // single one is — a same-hue halo washes out over the pink countries — and
    // takes the resting value only, there being no hover to state.
    map.setPaintProperty(
      "visited-cities-cluster",
      "circle-color",
      isDark ? CITY_BODY_DARK : CITY_BODY_LIGHT,
    );
    map.setPaintProperty(
      "visited-cities-cluster-glow",
      "circle-color",
      isDark ? CITY_GLOW_DARK : CITY_GLOW_LIGHT,
    );
    map.setPaintProperty(
      "visited-cities-cluster-glow",
      "circle-opacity",
      isDark ? 0.32 : 0.45,
    );

  }

  applyCityColors(colorSchemeQuery.matches);
  colorSchemeQuery.addEventListener("change", (e) =>
    applyCityColors(e.matches),
  );

  // Reduced transparency: the bead goes back to being a dot. The tint turns
  // solid and the two layers that exist only to fake depth — the highlight and
  // the shadow — go away. The halo stays: it is the map's own beacon, not a
  // surface laid over content, and nothing has to be read through it.
  const reducedTransparencyQuery = window.matchMedia(
    "(prefers-reduced-transparency: reduce)",
  );

  function applyCityTransparency(reduced: boolean): void {
    const opacities: [string, string, CircleNumberValue][] = [
      [
        "visited-cities",
        "circle-opacity",
        reduced ? MARKER_BODY_OPACITY_REDUCED : MARKER_BODY_OPACITY,
      ],
      [
        "visited-cities",
        "circle-stroke-opacity",
        reduced ? MARKER_RIM_OPACITY_REDUCED : MARKER_RIM_OPACITY,
      ],
      [
        "visited-cities-specular",
        "circle-opacity",
        reduced ? 0 : MARKER_SPECULAR_OPACITY,
      ],
      [
        "visited-cities-shadow",
        "circle-opacity",
        reduced ? 0 : MARKER_SHADOW_OPACITY,
      ],
      [
        "visited-cities-cluster",
        "circle-opacity",
        reduced ? MARKER_BODY_OPACITY_REDUCED : MARKER_BODY_OPACITY,
      ],
      [
        "visited-cities-cluster",
        "circle-stroke-opacity",
        reduced ? MARKER_RIM_OPACITY_REDUCED : MARKER_RIM_OPACITY,
      ],
      [
        "visited-cities-cluster-specular",
        "circle-opacity",
        reduced ? 0 : MARKER_SPECULAR_OPACITY,
      ],
      [
        "visited-cities-cluster-shadow",
        "circle-opacity",
        reduced ? 0 : MARKER_SHADOW_OPACITY,
      ],
    ];

    for (const [layer, property, value] of opacities) {
      // Guarding each layer rather than probing one and assuming the rest:
      // setPaintProperty on a missing layer doesn't throw, it fires an error
      // event, which is a worse thing to leave lying around than a check.
      if (!map.getLayer(layer)) continue;
      map.setPaintProperty(layer, property, value);
    }
  }

  applyCityTransparency(reducedTransparencyQuery.matches);
  reducedTransparencyQuery.addEventListener("change", (e) =>
    applyCityTransparency(e.matches),
  );

  // City hover: track hovered feature and show label tooltip.
  //
  // The label hangs off <body> rather than the map. The container rounds its
  // corners and clips to them — it has to, or the canvas would show through
  // square — so a label anywhere near an edge used to lose half its name to the
  // frame, and the cities at the edge are exactly the ones a globe keeps
  // rotating into view. Outside the container nothing clips it.
  const cityLabel = document.createElement("div");
  cityLabel.className = "city-label-overlay";
  cityLabel.style.display = "none";
  document.body.appendChild(cityLabel);

  // Which puts the label in page coordinates while the map hands out canvas
  // ones, so the container's own offset has to be added. It is measured at the
  // moment a label appears rather than on every reposition: the label is moved
  // once a frame while the globe turns, and a getBoundingClientRect between two
  // style writes is a forced reflow each time. Page coordinates also mean the
  // label rides the page's scrolling for free — only a resize can move the
  // container out from under a cached reading, and a resize ends the hover.
  let mapOrigin = { x: 0, y: 0 };
  // Half the label's rendered width, which is how far it reaches past the point
  // it is centred on. Zeroed whenever the name changes, and re-read on the next
  // draw. Same reasoning as the origin: measure on the events that change it,
  // not on the frames that use it.
  let labelHalfWidth = 0;
  function measureMapOrigin(): void {
    const rect = container.getBoundingClientRect();
    mapOrigin = {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
    };
  }

  // The hovered marker, which may be a city or a group of them. `stateful`
  // records whether a feature-state was actually written for it, so clearing
  // does not blindly write one back for a cluster that never had one.
  let hoveredMarker: { id: number; stateful: boolean } | null = null;
  // Last known cursor position in canvas coords, kept so we can re-evaluate the
  // hover when the map moves under a stationary cursor (pan/zoom/auto-rotation).
  let lastPoint: { x: number; y: number } | null = null;
  let cursorInside = false;
  // While dragging the map (e.g. rotating the globe) the cursor sits over a
  // moving canvas, so markers sweep under it without it being a real hover.
  // Suppress the tooltip entirely for the duration of the drag.
  let isDragging = false;

  /**
   * Whether a coordinate is on the half of the globe turned towards the viewer.
   * A flat map has no far side, so everything on it faces the camera.
   *
   * The globe hides half the world behind itself, but the cities back there are
   * still in the source and still project to a screen position — one that lands
   * inside the visible disc, near whichever limb they sit behind. A query near
   * the limb therefore reaches straight through the planet, which is how a
   * cursor at the edge of the Atlantic came back holding Krasnodar.
   */
  function facesCamera(lngLat: [number, number]): boolean {
    if (map.getProjection().type !== "globe") return true;
    const centre = map.getCenter();
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

  /**
   * The marker under a screen point, or null if the point is not on one.
   *
   * The box handed to queryRenderedFeatures is a coarse filter: it matches
   * anything whose drawn circle overlaps, so a dot answers from further away
   * than its centre, and the answer used to be accepted however far off it was.
   * Where the dots are spread out that reads as a generous target. Where the
   * globe's curvature packs a continent into a few pixels of limb it stops
   * reading as anything — every city near the edge answers at once, and the
   * name that wins can belong to a dot nowhere near the cursor. So the centre
   * has to be inside the same radius the box was drawn from.
   *
   * A cluster is exempt from that last rule, being the one mark that can be
   * drawn wider than the box it is caught in: a group of fifty runs to thirty
   * pixels of radius against the box's fourteen, so the same clamp would make
   * the middle of the bead hoverable and its outer half not. For those,
   * overlapping the box is the whole test — the query has already done real
   * geometry against the painted circle — while the distance goes on deciding
   * which candidate wins.
   */
  function getClosestMarker(point: { x: number; y: number }) {
    const bbox: [[number, number], [number, number]] = [
      [point.x - HOVER_RADIUS, point.y - HOVER_RADIUS],
      [point.x + HOVER_RADIUS, point.y + HOVER_RADIUS],
    ];
    const features = map.queryRenderedFeatures(bbox, {
      layers: ["visited-cities", "visited-cities-cluster"],
    });

    let closest: (typeof features)[number] | null = null;
    let minDist = Infinity;
    for (const f of features) {
      const coordinates = (f.geometry as Point).coordinates as [number, number];
      if (!facesCamera(coordinates)) continue;
      const projected = map.project(coordinates);
      const dx = projected.x - point.x;
      const dy = projected.y - point.y;
      const dist = dx * dx + dy * dy;
      const isCluster = f.properties?.point_count !== undefined;
      if (!isCluster && dist > HOVER_RADIUS * HOVER_RADIUS) continue;
      if (dist < minDist) {
        minDist = dist;
        closest = f;
      }
    }
    return closest;
  }

  function clearHover(): void {
    if (hoveredMarker !== null) {
      if (hoveredMarker.stateful) {
        map.setFeatureState(
          { source: "visited-cities", id: hoveredMarker.id },
          { hover: false },
        );
      }
      hoveredMarker = null;
    }
    map.getCanvas().style.cursor = "";
    cityLabel.style.display = "none";
  }

  // Resolve the hover + tooltip for a given cursor position. The tooltip stays
  // pinned to the cursor (`point`), but which marker is highlighted is decided
  // by what currently sits under that point — so it stays correct even when the
  // map moved rather than the cursor.
  function updateHover(point: { x: number; y: number } | null): void {
    const feature = point ? getClosestMarker(point) : null;

    if (feature && point) {
      const count = feature.properties?.point_count as number | undefined;
      // A cluster gets the cursor and the tooltip but no feature-state.
      // Supercluster mints cluster ids per zoom level, so the id a hover was
      // written against stops existing the moment the map zooms and the marker
      // is left lit with nothing able to turn it off again. Nothing is lost by
      // it: what a cluster has to answer with is the count, and the count is in
      // the tooltip.
      const next = { id: feature.id as number, stateful: count === undefined };
      // Compared on both fields. Cluster ids and city ids are drawn from
      // different number lines and only supercluster's own arithmetic keeps
      // them from colliding — not something the tooltip should have to trust to
      // know whether it is looking at the same mark as a moment ago.
      const isSame =
        hoveredMarker !== null &&
        hoveredMarker.id === next.id &&
        hoveredMarker.stateful === next.stateful;

      if (hoveredMarker !== null && !isSame && hoveredMarker.stateful) {
        map.setFeatureState(
          { source: "visited-cities", id: hoveredMarker.id },
          { hover: false },
        );
      }

      if (!isSame) {
        hoveredMarker = next;
        if (next.stateful) {
          map.setFeatureState(
            { source: "visited-cities", id: next.id },
            { hover: true },
          );
        }
        const lang = (localStorage.getItem("lang") as "en" | "ru") || "en";
        const name = feature.properties!.name as string;
        cityLabel.textContent =
          count !== undefined
            ? formatClusterLabel(count, lang)
            : getCityName(name, lang);
        labelHalfWidth = 0;
      }

      map.getCanvas().style.cursor = "pointer";
      // Re-measure only when the label is coming back from hidden — that is
      // once per hover, not once per frame of one.
      if (cityLabel.style.display === "none") measureMapOrigin();
      cityLabel.style.display = "flex";
      // And its width once per name, for the same reason. It has to be read
      // after the display, or a hidden element measures zero.
      if (labelHalfWidth === 0) labelHalfWidth = cityLabel.offsetWidth / 2;

      // The frame no longer clips the label, but the window still would — and
      // an element hanging past the right edge of the page is a horizontal
      // scrollbar on a page that has no other reason for one. The viewport is
      // the only boundary left, and the label stops at it.
      const centre = mapOrigin.x + point.x;
      const minCentre = window.scrollX + labelHalfWidth + VIEWPORT_EDGE_GAP;
      const maxCentre =
        window.scrollX +
        document.documentElement.clientWidth -
        labelHalfWidth -
        VIEWPORT_EDGE_GAP;
      cityLabel.style.left = `${Math.max(minCentre, Math.min(centre, maxCentre))}px`;
      cityLabel.style.top = `${mapOrigin.y + point.y - 30}px`;
    } else {
      clearHover();
    }
  }

  map.on("mousemove", (e) => {
    lastPoint = e.point;
    cursorInside = true;
    if (isDragging) return;
    updateHover(e.point);
  });

  map.on("dragstart", () => {
    isDragging = true;
    clearHover();
  });
  map.on("dragend", () => {
    isDragging = false;
    // Re-evaluate against where the cursor ended up after the drag.
    if (cursorInside && lastPoint) updateHover(lastPoint);
  });

  // Cursor left the map entirely — drop any active hover.
  map.on("mouseout", () => {
    cursorInside = false;
    lastPoint = null;
    clearHover();
  });

  // When the map moves under a stationary cursor (pan, zoom, or the globe's
  // auto-rotation) `mousemove` never fires, so the highlight + tooltip would
  // stick to a marker that has since slid away. Re-run the hover test against
  // the last cursor position. Skip work unless the cursor is over the map, and
  // coalesce to one queryRenderedFeatures call per frame so the per-frame
  // rotation stays cheap.
  let hoverRafPending = false;
  map.on("move", () => {
    if (isDragging || !cursorInside || lastPoint === null || hoverRafPending)
      return;
    hoverRafPending = true;
    requestAnimationFrame(() => {
      hoverRafPending = false;
      if (cursorInside && lastPoint) updateHover(lastPoint);
    });
  });

  // A cluster has to open, or it is a dead end: the reader can see that five
  // cities are hiding in there and has no way to reach them. Clicking eases to
  // exactly the zoom at which supercluster breaks this particular group apart —
  // asked rather than guessed, because a fixed "+2" either fails to open a
  // tight group or overshoots a loose one, scattering its beads past the edges
  // of the view.
  //
  // Hit-tested through getClosestMarker rather than by registering the click on
  // the cluster layer, which would run MapLibre's own test — one that reaches
  // straight through the planet on the globe and would open a cluster hiding
  // behind the far limb, the same failure facesCamera exists to prevent.
  map.on("click", (event) => {
    const feature = getClosestMarker(event.point);
    if (!feature) return;
    const clusterId = feature.properties?.cluster_id;
    if (typeof clusterId !== "number") return;

    const source = map.getSource("visited-cities") as GeoJSONSource | undefined;
    if (!source) return;

    // Asking for a cluster is taking the globe over, for the reason flyToCity
    // gives: the rotation turns the globe with setCenter, setCenter goes
    // through jumpTo, and jumpTo stops whatever animation it lands in. Left
    // spinning, the camera would set off for the cluster and be dragged off it
    // one frame later. mousedown already does this for a mouse, but a tap never
    // raises one.
    takeOver();

    const center = (feature.geometry as Point).coordinates as [number, number];

    source
      .getClusterExpansionZoom(clusterId)
      .then((zoom) => map.easeTo({ center, zoom, duration: 600 }))
      // A lookup that fails should still take the reader somewhere useful
      // rather than leaving the click dead — two levels in is enough to see
      // the group start to come apart.
      .catch(() => map.easeTo({ center, zoom: map.getZoom() + 2 }));
  });

  // Lift the shimmer once something real has been painted. The old signal was
  // `idle`, the strictest event MapLibre has: it waits for every tile to draw
  // AND the camera to come to rest. Neither is guaranteed here — in globe mode
  // the auto-rotation moves the camera on every frame, forever, so the map is
  // never at rest, and a single stalled tile is enough to withhold the event on
  // its own. When it never arrives the shimmer covers the map indefinitely.
  let revealed = false;
  function revealMap(): void {
    if (revealed) return;
    revealed = true;
    const placeholder = document.getElementById("placeholder");
    if (placeholder) placeholder.style.opacity = "0";
  }

  map.on("render", () => {
    if (map.areTilesLoaded()) revealMap();
  });

  // Backstop: a stalled tile must not be able to strand the shimmer on screen.
  // A partly-drawn map is worth more to the reader than a shimmer that never
  // resolves.
  setTimeout(revealMap, PLACEHOLDER_TIMEOUT_MS);

  // Function to fly to a city
  function flyToCity(cityName: string): void {
    if (cityCoordinates[cityName]) {
      // Asking for a city is taking the globe over, even though it arrived as a
      // call rather than a gesture — and the spin has to stop for the flight to
      // survive at all: the rotation's setCenter goes through jumpTo, and jumpTo
      // stops the animation it lands in. The camera would leave for the city and
      // be dragged off it a frame later.
      takeOver();
      map.flyTo({
        center: cityCoordinates[cityName] as [number, number],
        zoom: 6,
        duration: 1000,
      });
    }
  }

  // Expose flyToCity globally for external use
  (window as unknown as { flyToCity: typeof flyToCity }).flyToCity = flyToCity;
}

// Defer the (heavy) MapLibre instantiation until the map is actually near the
// viewport. On this page the map sits at the top, so it still initialises on
// load — but if the user lands scrolled down (anchor link, restored scroll),
// the ~1 MB WebGL setup and remote style/tile fetches are skipped until needed.
function scheduleInit(): void {
  const container = document.getElementById("map");
  if (!container) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        void initMap();
      }
    },
    { rootMargin: "200px" },
  );
  observer.observe(container);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scheduleInit);
} else {
  scheduleInit();
}
