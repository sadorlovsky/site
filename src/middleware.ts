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
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for Astro
        "img-src 'self' data: blob: https:",
        "connect-src 'self'",
        "font-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; ")
    );

    return newResponse;
  }

  return response;
});
