type SnackbarType = "error" | "success" | "info";

export function showSnackbar(message: string, type: SnackbarType = "error"): void {
  // Remove existing snackbar if any
  const existing = document.querySelector(".snackbar");
  if (existing) existing.remove();

  const snackbar = document.createElement("div");
  snackbar.className = `snackbar snackbar--${type}`;
  snackbar.setAttribute("role", "alert");
  snackbar.innerHTML = `
    <span class="snackbar-message">${message}</span>
    <button class="snackbar-close" aria-label="Close">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  `;

  document.body.appendChild(snackbar);

  // Trigger animation
  requestAnimationFrame(() => {
    snackbar.classList.add("snackbar--visible");
  });

  // Close button handler
  const closeBtn = snackbar.querySelector(".snackbar-close");
  closeBtn?.addEventListener("click", () => hideSnackbar(snackbar));

  // Auto-hide after 5 seconds
  setTimeout(() => hideSnackbar(snackbar), 5000);
}

function hideSnackbar(snackbar: Element): void {
  snackbar.classList.remove("snackbar--visible");
  snackbar.addEventListener("transitionend", () => snackbar.remove(), { once: true });
}
