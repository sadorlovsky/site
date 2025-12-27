function moveEye(
  e: MouseEvent,
  eyeRectSelector: string,
  eyeBallSelector: string
) {
  const eyeRect = document.getElementById(eyeRectSelector);
  const eyeBall = document.getElementById(eyeBallSelector);

  if (!eyeRect || !eyeBall) {
    return;
  }

  // Eye and eye ball centers
  const eyeCenterX = 169.21;
  const eyeCenterY = 157.48;
  const eyeRadius = 192.42 - 169.21; // The radius of the eye rect's bounding circle

  const svgRect = eyeRect.getBoundingClientRect();

  // Calculate mouse position relative to the SVG container
  const mouseX = e.clientX - svgRect.left;
  const mouseY = e.clientY - svgRect.top;

  // Calculate direction vector from eye center to mouse position
  let directionX = mouseX - eyeCenterX;
  let directionY = mouseY - eyeCenterY;

  // Calculate the distance from the eye center to the mouse position
  const distance = Math.sqrt(directionX * directionX + directionY * directionY);

  // Calculate the maximum allowable distance for the eye ball from the eye center
  // This might need adjustment depending on the exact bounds you want for the eyeball.
  const maxDistance = eyeRadius - (190.9 - 174.45); // eyeRadius - eyeBallRadius

  // If the distance is within the eye, move directly. Otherwise, scale the movement.
  if (distance > maxDistance) {
    directionX = (directionX / distance) * maxDistance;
    directionY = (directionY / distance) * maxDistance;
  }

  // Calculate new position for the eye ball
  const newEyeBallCenterX = eyeCenterX + directionX;
  const newEyeBallCenterY = eyeCenterY + directionY;

  // Apply translation to the eye ball
  eyeBall.setAttribute(
    "transform",
    `translate(${newEyeBallCenterX - 174.45}, ${newEyeBallCenterY - 157.66})`
  );
}

document.addEventListener("mousemove", (e) =>
  moveEye(e, "right-eye-rect", "right-eye-ball")
);
document.addEventListener("mousemove", (e) =>
  moveEye(e, "left-eye-rect", "left-eye-ball")
);
