// The blob behind the avatar leans toward the cursor and settles back on a
// spring.
//
// Not initMagnet (magnet.ts). That one is a local, six-pixel lerp for controls
// the cursor is already on top of: it says "this thing is under your pointer".
// This is the opposite scale — a 20rem backdrop reacting to a pointer anywhere
// on the page, which needs a longer reach, a much weaker coupling, and real
// overshoot, because a shape this size arriving without any wobble reads as a
// slide rather than as something liquid. The idiom is still the site's: lerp
// or spring toward a target, stop the loop at rest, sit out reduced motion.
//
// It also has a neighbour on this very page — the avatar's eyes already follow
// the cursor (eye-moving.ts). The figure was watching you from a backdrop that
// was not; now they notice together.

// From magnet.ts, which already exports it — and importing rather than
// re-declaring is also what keeps this file a module, since two page scripts
// sharing a global `const prefersReducedMotion` is a redeclaration error.
import { prefersReducedMotion } from "./magnet";

const REACH = 560; // Cursor distance over which the pull scales in, px
const MAX = 18; // Furthest the shape may drift from rest, px
const TILT = 1.6; // Furthest it may lean, deg
// Two stages of smoothing, because a pointer does not move like a finger on
// glass — it teleports. The first stage eases the goal itself, so a flick
// across the page becomes a ramp instead of a step, and the second is the
// spring that chases it. A stiff spring on a stepping target is what made the
// first pass snap.
const FOLLOW = 0.09; // Per-frame easing of the goal the spring is chasing
const STIFFNESS = 0.03; // Spring constant: how hard it is pulled to target
const DAMPING = 0.85; // Velocity retained per frame; below 1 or it never rests
const REST = 0.05; // Below this (px and px/frame) the loop stops

// A coarse pointer has no hover to react to, and reading a touch as a cursor
// would make the shape jump on every tap.
const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)")
  .matches;

const shape = document.querySelector<HTMLElement>(".shape");

if (shape && hasFinePointer && !prefersReducedMotion) {
  const current = { x: 0, y: 0 };
  const velocity = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const goal = { x: 0, y: 0 };
  let running = false;

  function frame() {
    if (!shape) return;

    // Stage one: the goal drifts toward where the cursor last was, so the
    // spring is never handed a discontinuity.
    target.x += (goal.x - target.x) * FOLLOW;
    target.y += (goal.y - target.y) * FOLLOW;

    // Stage two: spring integration rather than a lerp: the velocity term is
    // what lets it pass its target slightly and swing back, and that overshoot
    // is the whole difference between liquid and mechanical.
    velocity.x = (velocity.x + (target.x - current.x) * STIFFNESS) * DAMPING;
    velocity.y = (velocity.y + (target.y - current.y) * STIFFNESS) * DAMPING;
    current.x += velocity.x;
    current.y += velocity.y;

    // The lean is taken from where the shape actually is, not from where the
    // cursor is, so the deformation arrives with the movement and unwinds with
    // it. `rotate` is left alone — the spin animation owns that property.
    const leanX = (current.x / MAX) * TILT;
    const leanY = (current.y / MAX) * TILT;
    shape.style.transform =
      `translate(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px) ` +
      `skew(${leanX.toFixed(2)}deg, ${leanY.toFixed(2)}deg)`;

    // The goal has to be reached too, not just the target: the easing stage
    // moves slowly enough that the spring can sit still on a target that is
    // itself still travelling, and stopping there would strand the shape.
    const settled =
      Math.abs(goal.x - target.x) < REST &&
      Math.abs(goal.y - target.y) < REST &&
      Math.abs(current.x - target.x) < REST &&
      Math.abs(current.y - target.y) < REST &&
      Math.abs(velocity.x) < REST &&
      Math.abs(velocity.y) < REST;

    if (settled) {
      running = false;
      return;
    }
    requestAnimationFrame(frame);
  }

  function kick() {
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  function rest() {
    goal.x = 0;
    goal.y = 0;
    kick();
  }

  document.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      if (!shape) return;

      const rect = shape.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy);
      // Falls off with distance instead of clamping: near the shape the pull is
      // at full strength, and across the page it fades out rather than sticking
      // at the maximum the whole time the cursor is far away.
      const falloff = Math.max(0, 1 - distance / REACH);
      const pull = (falloff * MAX) / (distance || 1);

      goal.x = dx * pull;
      goal.y = dy * pull;
      kick();
    },
    { passive: true },
  );

  document.addEventListener("pointerleave", rest);
  window.addEventListener("blur", rest);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) rest();
  });
}
