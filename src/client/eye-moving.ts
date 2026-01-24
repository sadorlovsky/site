// Movement multipliers for parallax effect
const IRIS_MULTIPLIER = 1.0; // Base movement (iris/радужка)
const PUPIL_MULTIPLIER = 1.15; // Pupil moves slightly more (deeper in eye)
const HIGHLIGHT_MULTIPLIER = 0.95; // Highlight follows pupil but lags slightly (stays inside pupil)

// Eye configuration for each eye
const eyes = {
  left: {
    rectId: "left-eye-rect",
    ballId: "left-eye-ball",
    pupilId: "left-eye-pupil",
    highlightId: "left-eye-highlight",
    centerX: 67.21,
    centerY: 165.48,
    radius: 90.42 - 67.21,
    ballCenterX: 72.45,
    ballCenterY: 165.66,
    ballRadius: 88.9 - 72.45,
  },
  right: {
    rectId: "right-eye-rect",
    ballId: "right-eye-ball",
    pupilId: "right-eye-pupil",
    highlightId: "right-eye-highlight",
    centerX: 169.21,
    centerY: 157.48,
    radius: 192.42 - 169.21,
    ballCenterX: 174.45,
    ballCenterY: 157.66,
    ballRadius: 190.9 - 174.45,
  },
};

// Current position for smooth interpolation (base position)
let currentPositions = {
  left: { x: 0, y: 0 },
  right: { x: 0, y: 0 },
};

// Target position
let targetPositions = {
  left: { x: 0, y: 0 },
  right: { x: 0, y: 0 },
};

// Animation state
let isAnimating = false;

// Check for reduced motion preference
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

function calculateEyePosition(
  mouseX: number,
  mouseY: number,
  eye: (typeof eyes)["left"],
  svgRect: DOMRect,
): { x: number; y: number } {
  // Calculate mouse position relative to the SVG container
  const relativeX = mouseX - svgRect.left;
  const relativeY = mouseY - svgRect.top;

  // Calculate direction vector from eye center to mouse position
  let directionX = relativeX - eye.centerX;
  let directionY = relativeY - eye.centerY;

  // Calculate the distance from the eye center to the mouse position
  const distance = Math.sqrt(directionX * directionX + directionY * directionY);

  // Maximum distance the eyeball can move
  const maxDistance = eye.radius - eye.ballRadius;

  // Scale movement if outside bounds
  if (distance > maxDistance) {
    directionX = (directionX / distance) * maxDistance;
    directionY = (directionY / distance) * maxDistance;
  }

  return {
    x: eye.centerX + directionX - eye.ballCenterX,
    y: eye.centerY + directionY - eye.ballCenterY,
  };
}

function animate() {
  const smoothFactor = prefersReducedMotion ? 1 : 0.15;
  let needsUpdate = false;

  for (const [key, eye] of Object.entries(eyes)) {
    const eyeKey = key as "left" | "right";
    const eyeBall = document.getElementById(eye.ballId);
    const eyePupil = document.getElementById(eye.pupilId);
    const eyeHighlight = document.getElementById(eye.highlightId);
    if (!eyeBall) continue;

    const current = currentPositions[eyeKey];
    const target = targetPositions[eyeKey];

    // Interpolate towards target
    const newX = lerp(current.x, target.x, smoothFactor);
    const newY = lerp(current.y, target.y, smoothFactor);

    // Check if we need to continue animating
    const deltaX = Math.abs(newX - target.x);
    const deltaY = Math.abs(newY - target.y);

    if (deltaX > 0.01 || deltaY > 0.01) {
      needsUpdate = true;
    }

    current.x = newX;
    current.y = newY;

    // Apply different multipliers for parallax effect
    const irisX = newX * IRIS_MULTIPLIER;
    const irisY = newY * IRIS_MULTIPLIER;
    const pupilX = newX * PUPIL_MULTIPLIER;
    const pupilY = newY * PUPIL_MULTIPLIER;
    // Highlight barely moves (simulates fixed light source)
    const highlightX = newX * HIGHLIGHT_MULTIPLIER;
    const highlightY = newY * HIGHLIGHT_MULTIPLIER;

    // Apply transforms
    eyeBall.setAttribute("transform", `translate(${irisX}, ${irisY})`);
    eyePupil?.setAttribute("transform", `translate(${pupilX}, ${pupilY})`);
    eyeHighlight?.setAttribute(
      "transform",
      `translate(${highlightX}, ${highlightY})`,
    );
  }

  if (needsUpdate) {
    requestAnimationFrame(animate);
  } else {
    isAnimating = false;
  }
}

function handlePointerMove(e: MouseEvent | TouchEvent) {
  // Get coordinates from mouse or touch event
  const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
  const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

  // Calculate target positions for both eyes
  for (const [key, eye] of Object.entries(eyes)) {
    const eyeKey = key as "left" | "right";
    const eyeRect = document.getElementById(eye.rectId);
    if (!eyeRect) continue;

    const svgRect = eyeRect.getBoundingClientRect();
    const position = calculateEyePosition(clientX, clientY, eye, svgRect);

    targetPositions[eyeKey] = position;
  }

  // Start animation loop if not already running
  if (!isAnimating) {
    isAnimating = true;
    requestAnimationFrame(animate);
  }
}

// Throttle function for performance
function throttle<T extends (...args: never[]) => void>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Throttled handler - updates every 16ms (~60fps)
const throttledHandler = throttle(handlePointerMove, 16);

// Event listeners
document.addEventListener("mousemove", throttledHandler);
document.addEventListener("touchmove", throttledHandler, { passive: true });

// Reset eyes when pointer leaves the window
document.addEventListener("mouseleave", () => {
  targetPositions = {
    left: { x: 0, y: 0 },
    right: { x: 0, y: 0 },
  };

  if (!isAnimating) {
    isAnimating = true;
    requestAnimationFrame(animate);
  }
});
