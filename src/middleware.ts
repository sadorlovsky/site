import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
  const response = await next();

  // Add CSP header for admin panel pages
  if (url.pathname.startsWith("/wishlist/~")) {
    // Clone response to modify headers
    const newResponse = new Response(response.body, response);

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

    return newResponse;
  }

  return response;
});
