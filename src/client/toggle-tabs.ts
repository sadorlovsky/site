// Drives a ToggleGroup rendered with variant="tabs".
//
// Three jobs, none of which a stylesheet can do: keep the WAI-ARIA tab pattern
// honest (roving tabindex, arrow keys, aria-selected), park the sliding marker
// under the current label, and keep that label on screen when the rail is
// narrower than its tabs.
//
// Activation is automatic — an arrow key both moves focus and switches the
// panel. The manual pattern exists for panels that cost something to show;
// these are already in the document with `hidden` toggled, so making someone
// press Enter after arrowing would be ceremony over nothing.

import { initScrollableCategories } from "@client/scrollable-categories";

/** Why the current tab changed, so callers can treat a click differently from
    the first paint — scrolling on one and not the other, typically. */
export type ToggleTabsCause = "init" | "user";

export interface ToggleTabsInstance {
  /** Switch tabs from outside — a hashchange, a deep link. Counts as "init":
      nothing the reader did, so nothing should move under them. */
  select: (id: string) => void;
  /** Re-measure the marker. Called on its own for changes no observer here
      sees. */
  refresh: () => void;
}

export function initToggleTabs(
  group: HTMLElement,
  onChange: (id: string, cause: ToggleTabsCause) => void,
): ToggleTabsInstance {
  const tabs = Array.from(group.querySelectorAll<HTMLElement>('[role="tab"]'));
  const marker = group.querySelector<HTMLElement>(".kit-toggle-group__marker");

  // The rail is the scroller in the narrow case, so it owns the edge fades.
  // "minimal" rather than "center": on a wide screen nothing overflows and the
  // row must not twitch, and on a narrow one only a tab that is actually cut
  // off is worth scrolling to.
  const scroller = initScrollableCategories({
    scroller: group,
    scrollMode: "minimal",
  });

  let current = "";

  const tabFor = (id: string) => tabs.find((tab) => tab.dataset.id === id);

  // The lens takes the whole capsule, so the four properties are simply the
  // tab's own offset box — the same four nav-dock.ts writes as --dock-*. Height
  // and vertical offset are set as well as width, so a rail that ever wraps to
  // two lines still lands the glass on the right tab rather than on the one
  // above it.
  function moveMarker() {
    if (!marker) return;
    const tab = tabFor(current);
    if (!tab) return;
    marker.style.setProperty("--marker-x", `${tab.offsetLeft}px`);
    marker.style.setProperty("--marker-y", `${tab.offsetTop}px`);
    marker.style.setProperty("--marker-w", `${tab.offsetWidth}px`);
    marker.style.setProperty("--marker-h", `${tab.offsetHeight}px`);
  }

  function select(id: string, cause: ToggleTabsCause) {
    const tab = tabFor(id);
    if (!tab) return;
    current = id;

    for (const item of tabs) {
      const isActive = item === tab;
      item.setAttribute("aria-selected", String(isActive));
      item.classList.toggle("is-active", isActive);
      // Roving tabindex: the rail is one stop in the page's tab order and the
      // arrows move within it, rather than five stops in a row.
      item.tabIndex = isActive ? 0 : -1;
    }

    moveMarker();
    scroller.scrollToActive();
    onChange(id, cause);
  }

  group.addEventListener("click", (event) => {
    const tab = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      '[role="tab"]',
    );
    const id = tab?.dataset.id;
    if (!id) return;
    event.preventDefault();
    select(id, "user");
  });

  group.addEventListener("keydown", (event) => {
    const index = tabs.indexOf(document.activeElement as HTMLElement);
    if (index === -1) return;

    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = (index + 1) % tabs.length;
        break;
      case "ArrowLeft":
        next = (index - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const id = tabs[next].dataset.id;
    if (!id) return;
    select(id, "user");
    tabs[next].focus();
  });

  // Anything that changes a label's width moves the line under it: the
  // viewport, the web font arriving, and — the one that matters here — the
  // language switch, which rewrites every label from data-en to data-ru and
  // makes the row half again as wide.
  const observer = new ResizeObserver(moveMarker);
  observer.observe(group);
  for (const tab of tabs) observer.observe(tab);
  document.fonts?.ready.then(moveMarker);

  // Open on whatever the server marked, so a rail with no caller-supplied
  // starting tab still lands somewhere sane.
  const initial =
    tabs.find((tab) => tab.getAttribute("aria-selected") === "true") ?? tabs[0];
  if (initial?.dataset.id) select(initial.dataset.id, "init");

  // A frame later, so the marker is already sitting where it belongs when the
  // rule that reveals *and* animates it applies — otherwise it sweeps in from
  // the left edge of the rail on every page load.
  requestAnimationFrame(() => group.classList.add("has-marker"));

  return {
    select: (id) => select(id, "init"),
    refresh: moveMarker,
  };
}
