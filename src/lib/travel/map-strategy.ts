/**
 * Which of the two answers to "what happens to the map when the reader
 * navigates away and comes back" is in force.
 *
 * `false` — the map is dismantled on the way out and rebuilt on the way back.
 * The WebGL context is released, every listener is returned, and the container
 * that arrives on the next visit is an empty one. Correct, and the cost is a
 * full MapLibre boot plus a fresh style fetch on every return to /travel.
 *
 * `true` — the container is marked `transition:persist`, so Astro carries the
 * live element across the swap instead of replacing it. The map is never
 * rebuilt because it is never taken apart: same canvas, same WebGL context,
 * same camera position the reader left it at. Teardown still runs when the
 * destination has no map to carry the element into.
 *
 * Both paths are implemented and both are correct; this picks which one runs.
 * The flag lives here, apart from either, because the template and the client
 * script have to agree — a container marked persist whose script still
 * dismantles the map would leave an emptied canvas on screen with no way back.
 */
export const PERSIST_MAP_ACROSS_NAVIGATION = false;

/** The name the persisted container is paired by across a navigation. */
export const MAP_PERSIST_NAME = "travel-map";
