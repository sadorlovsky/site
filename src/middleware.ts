import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
  const response = await next();
  const newResponse = new Response(response.body, response);

  // Security headers for all pages
  newResponse.headers.set("X-Content-Type-Options", "nosniff");
  newResponse.headers.set("X-Frame-Options", "DENY");
  newResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Additional headers for admin panel
  if (url.pathname.startsWith("/wishlist/~")) {
    newResponse.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'", // unsafe-inline needed for Astro hydration
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "connect-src 'self'",
        "font-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    );

    // Disable caching for admin pages
    newResponse.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private",
    );
    newResponse.headers.set("CDN-Cache-Control", "no-store");
    newResponse.headers.set("Pragma", "no-cache");
    newResponse.headers.set("Expires", "0");
  }

  return newResponse;
});
