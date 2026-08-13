import { defineConfig, envField, fontProviders } from "astro/config";
import icon from "astro-icon";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import sitemap from "@astrojs/sitemap";
import { loadEnv } from "vite";
import browserslist from "browserslist";
import { browserslistToTargets } from "lightningcss";
import { readFile, writeFile } from "node:fs/promises";

// Targets deliberately include Safari/iOS < 17.5 so Lightning CSS lowers
// light-dark() into @media (prefers-color-scheme) fallbacks at build time.
const BROWSERS = "defaults, Safari >= 15.4, iOS >= 15.4";
const cssTargets = browserslistToTargets(browserslist(BROWSERS));

// The same browsers again, restated for build.cssTarget, because Vite does not
// reuse the targets above when it minifies. It calls Lightning CSS a second
// time with targets of its own, built from build.cssTarget alone — and that
// falls back to build.target, which is "esnext", which converts to an empty
// target set, which Lightning CSS reads as "every browser is current" and
// takes as licence to delete vendor prefixes. It deleted
// -webkit-box-decoration-break, and Safari — which still needs it — stopped
// cloning the padding and radius of a city capsule across a line break. Dev
// was fine because dev never minifies.
//
// Vite's converter only knows these six names and throws on anything else, so
// the mobile entries in the browserslist result are dropped here; they are all
// Chromium or Gecko and their desktop counterparts set the floor.
const VITE_CSS_TARGET_NAMES = {
  chrome: "chrome",
  edge: "edge",
  firefox: "firefox",
  ios_saf: "ios",
  opera: "opera",
  safari: "safari",
};
const cssTarget = Object.entries(
  browserslist(BROWSERS).reduce((oldest, entry) => {
    const [browser, range] = entry.split(" ");
    const name = VITE_CSS_TARGET_NAMES[browser];
    // Versions arrive as "15.4", as a "15.2-15.3" range, or as "TP" for
    // Safari's preview, which has no number to compare and no floor to set.
    const version = Number.parseFloat(range);
    if (!name || Number.isNaN(version)) return oldest;
    if (!(name in oldest) || version < oldest[name]) oldest[name] = version;
    return oldest;
  }, {}),
).map(([name, version]) => `${name}${version}`);

const { VERCEL_ISR_BYPASS_TOKEN, CDN_DOMAIN, CDN_DEV_DOMAIN } = loadEnv(
  process.env.NODE_ENV,
  process.cwd(),
  "",
);

const isProd = process.env.NODE_ENV === "production";
// Both vars are optional (see the env schema below), so dev falls back to the
// production CDN exactly like src/lib/wishlist.ts does. Without the fallback an
// undefined domain reaches image.domains, config validation fails with
// "image.domains.0: Required", and the dev server exits before it starts.
const cdnDomain = (isProd ? CDN_DOMAIN : (CDN_DEV_DOMAIN ?? CDN_DOMAIN)) ?? "";

// The Vercel adapter emits a route that stamps `immutable` onto everything
// under /_astro, and that route never fires. normalizeRoutes() puts
// {handle: "filesystem"} in front of it, the filesystem phase serves the file
// and stops, and the rule sitting behind it only ever sees paths that are not
// files. So every content-hashed asset went out with Vercel's default
// `public, max-age=0, must-revalidate` and got revalidated on every single
// navigation — both Inter variable fonts, 723 KB together, preloaded on all
// five pages, for a measured 476 ms of 304s per page view.
//
// Moving the rule ahead of the filesystem phase is what the adapter itself
// does for the static headers it generates (createRoutesWithStaticHeaders in
// @astrojs/vercel splices at exactly this index), and `continue: true` keeps
// routing going, so the file is still served by the filesystem phase — with
// the header attached.
//
// This patches .vercel/output/config.json rather than vercel.json because the
// build output is what Vercel actually reads: the adapter writes that file
// wholesale, and whether the platform merges vercel.json's `headers` into a
// Build Output API deployment is undocumented either way.
// The second rule this plugin writes, and the reason it is here rather than in
// src/middleware.ts: middleware does not run for a prerendered page. There is
// no middleware function in .vercel/output/functions at all — it is compiled
// into the Node function, and serving a static file never calls that. So the
// build output is the only place a header can be attached to /, /travel or a
// post.
//
// `max-age=0` and nothing else is Vercel's default for these, which means every
// navigation to a page the visitor already has spends a round trip to be told
// nothing changed. From Almaty that is ~290 ms of pure distance: the measured
// TTFB floor is 287 ms for 519 bytes of static from Frankfurt, so the wait is
// the trip, not the work.
//
// stale-while-revalidate says: serve the copy on disk immediately, then refresh
// it in the background. The visitor waits for nothing and is at most one
// navigation behind. max-age stays 0 deliberately — a browser cache cannot be
// purged by a deploy or by anything else, so freshness is checked every time
// and only the *waiting* is skipped.
//
// An hour is the window a page may be behind a deploy by. Long enough to cover
// a session's worth of navigation, short enough that a correction is not still
// hidden tomorrow.
const HTML_CACHE_CONTROL = "public, max-age=0, stale-while-revalidate=3600";

function outputHeaders() {
  let root;
  return {
    name: "output-headers",
    hooks: {
      "astro:config:done": ({ config }) => {
        root = config.root;
      },
      "astro:build:done": async ({ logger, pages }) => {
        const file = new URL("./.vercel/output/config.json", root);
        const config = JSON.parse(await readFile(file, "utf8"));
        const routes = config.routes ?? [];

        const filesystem = routes.findIndex((r) => r.handle === "filesystem");
        const rule = routes.findIndex(
          (r) =>
            r.src?.includes("_astro") &&
            r.headers?.["cache-control"]?.includes("immutable"),
        );

        // Loud on purpose. A silent skip here is how the site ended up
        // revalidating 723 KB of fonts on every navigation in the first place;
        // if the adapter ever renames or fixes this, the build should say so.
        if (rule === -1 || filesystem === -1) {
          throw new Error(
            "output-headers: expected a /_astro immutable route and a " +
              "filesystem phase in .vercel/output/config.json, found " +
              `rule=${rule} filesystem=${filesystem}. The adapter's output ` +
              "changed — re-check whether this patch is still needed.",
          );
        }

        if (rule > filesystem) {
          routes.splice(filesystem, 0, ...routes.splice(rule, 1));
          logger.info("/_astro assets now cached immutably");
        }

        // Only the pages that were actually prerendered. `pages` holds exactly
        // those — a route rendered on demand is not in it — so the rule can
        // name them one by one instead of matching a shape and hoping. The
        // wishlist is server-rendered and stays out of this by construction:
        // it is served by an ISR function, where Vercel's own caching decides
        // what a response may carry.
        const paths = pages
          .map(({ pathname }) => pathname.replace(/^\/|\/$/g, ""))
          .filter(Boolean)
          .sort();
        // The group is optional so that `/` — the index, whose pathname is
        // empty — is matched by the same rule as the rest.
        const src = `^/(?:${paths.join("|")})?/?$`;

        if (paths.length > 0 && !routes.some((r) => r.src === src)) {
          // Ahead of the filesystem phase and `continue: true`, for the same
          // reason the /_astro rule has to be: the phase serves the file and
          // stops, so a rule behind it is only ever read by paths that are not
          // files. Re-found rather than reused — the splice above moved it.
          const phase = routes.findIndex((r) => r.handle === "filesystem");
          routes.splice(phase, 0, {
            src,
            headers: { "cache-control": HTML_CACHE_CONTROL },
            continue: true,
          });
          logger.info(
            `${paths.length + 1} prerendered pages now revalidate in the background`,
          );
        }

        await writeFile(file, JSON.stringify(config, null, "\t"), "utf8");
      },
    },
  };
}

// The grounds a code block is painted on — the pair named in global.css beside
// the Shiki token rules, restated here because the transformer below measures
// against them. Keep the two in step.
const CODE_GROUND = { light: [241, 241, 247], dark: [17, 17, 20] };

const channel = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** The three hex lengths CSS has. Longest first, so `#aabbcc` is never read as
 *  `#aab` with a tail left over, and the lookahead stops a four-digit value
 *  from matching its own first three. */
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/;

/**
 * #rgb, #rrggbb and #rrggbbaa, composited over the ground it will sit on.
 * Null for anything else — a 4- or 5-digit value has no meaning in CSS, and
 * reading one anyway produced a channel of NaN, a contrast of NaN, a ramp that
 * could never pass and the literal colour `#NaNNaNNaN` baked into the build.
 */
function readColor(hex, ground) {
  const raw = hex.replace("#", "");
  if (raw.length !== 3 && raw.length !== 6 && raw.length !== 8) return null;
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const rgb = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
  const alpha =
    full.length === 8 ? Number.parseInt(full.slice(6, 8), 16) / 255 : 1;
  if (alpha === 1) return rgb;
  return rgb.map((v, i) => Math.round(v * alpha + ground[i] * (1 - alpha)));
}

const toHex = (rgb) =>
  "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");

/**
 * Drag a token colour until it clears 4.5:1 on the ground it is painted on,
 * keeping its hue.
 *
 * Every light syntax theme worth using is drawn for a white page, and this site
 * paints code onto a tinted recess instead — which is enough to sink the pale
 * end of the palette. Vitesse Light's comment is #A0ADA0: 2.34:1 on the white
 * it was built for and 2.08:1 here, and its dimmed punctuation is worse. A
 * comment is text, and PRODUCT.md commits this site to WCAG 2.2 AA, so the
 * palette has to answer for it rather than the ground being lightened back to
 * white to flatter a theme.
 *
 * Derived rather than picked, the way the accent's deep pair is: each colour
 * keeps its own hue and travels toward the far end of the scheme in 5% steps
 * until it passes. Anything already clearing the bar is left exactly alone, so
 * the theme still looks like itself — this only touches what could not be read.
 */
function legible(hex, scheme) {
  const ground = CODE_GROUND[scheme];
  const start = readColor(hex, ground);
  // Nothing this function can say about a colour it could not read. The theme
  // keeps what it wrote.
  if (!start) return hex;
  if (contrast(start, ground) >= 4.5) return toHex(start);
  const towardBlack = scheme === "light";
  for (let t = 0.05; t <= 1.0001; t += 0.05) {
    const moved = start.map((v) =>
      Math.round(towardBlack ? v * (1 - t) : v + (255 - v) * t),
    );
    if (contrast(moved, ground) >= 4.5) return toHex(moved);
  }
  return towardBlack ? "#000000" : "#ffffff";
}

/** Rewrites `color:` and `--shiki-dark:` on every highlighted span. */
const legibleTokens = {
  name: "legible-tokens",
  span(node) {
    const style = node.properties?.style;
    if (typeof style !== "string") return;
    node.properties.style = style
      .replace(
        new RegExp(`(^|;)\\s*color:\\s*(${HEX.source})`, "g"),
        (_m, lead, hex) => `${lead}color:${legible(hex, "light")}`,
      )
      .replace(
        new RegExp(`--shiki-dark:\\s*(${HEX.source})`, "g"),
        (_m, hex) => `--shiki-dark:${legible(hex, "dark")}`,
      );
  },
};

/**
 * Takes Shiki's `overflow-x: auto` off the `<pre>`.
 *
 * It writes that inline, where no stylesheet can answer it without
 * `!important`, and it makes the frame the scrollport: the copy button and the
 * language label are pinned to the `pre`'s corner, so both rode the content
 * out of view the moment a reader scrolled a wide listing. The blog's own CSS
 * puts the scrolling on the `code` inside instead — the frame stays, the
 * listing moves.
 */
const scrollTheCode = {
  name: "scroll-the-code",
  pre(node) {
    const style = node.properties?.style;
    if (typeof style !== "string") return;
    node.properties.style = style
      .replace(/(^|;)\s*overflow-x\s*:[^;]*/g, "$1")
      .replace(/;{2,}/g, ";")
      .replace(/^;|;$/g, "");
  },
};

// https://astro.build/config
export default defineConfig({
  site: "https://orlovsky.dev",
  output: "server",
  vite: {
    optimizeDeps: {
      exclude: ["@simplewebauthn/server"],
    },
    css: {
      transformer: "lightningcss",
      lightningcss: {
        targets: cssTargets,
      },
    },
    build: {
      target: "esnext",
      cssTarget,
      cssMinify: "lightningcss",
      // Every flag in flag-icons is a file under the inline limit, so Vite was
      // turning all 439 of them into data: URIs and welding them into the
      // stylesheet: 500 639 bytes of render-blocking CSS on /travel, where 34
      // flags are actually shown. Left as files they are fetched only when a
      // rule that uses one applies, they no longer hold up the first paint, and
      // they are hashed — so the immutable rule further down caches them for a
      // year. Everything else keeps Vite's default judgement.
      assetsInlineLimit: (filePath) =>
        filePath.includes("flag-icons") ? false : undefined,
    },
    ssr: {
      noExternal: ["@simplewebauthn/server"],
    },
  },
  adapter: vercel({
    isr: {
      // Bypass token for on-demand revalidation
      bypassToken: VERCEL_ISR_BYPASS_TOKEN,
      // Exclude API routes and admin pages from ISR
      exclude: [/^\/api\/.*/, /^\/wishlist\/~(\/.*)?$/],
    },
  }),
  image: {
    domains: cdnDomain ? [cdnDomain] : [],
  },
  integrations: [
    icon(),
    mdx(),
    react(),
    sitemap({
      filter: (page) => !page.includes("/wishlist/~"),
    }),
    outputHeaders(),
  ],
  markdown: {
    // Catppuccin's grounds are #eff1f5 and #303446 — a blue-lilac pair, and
    // the second is a medium blue-grey slab. On a site whose pages are ghost
    // white and warm near-black, every code block was a window into a third
    // colour world. Vitesse is built for #ffffff and #121212 and keeps its
    // tokens warm and low-chroma, which is the same room this site is in; the
    // ground itself is then repainted to the site's own slab in global.css,
    // so the block reads as a recess in the page rather than as a card from
    // somewhere else.
    shikiConfig: {
      themes: {
        light: "vitesse-light",
        dark: "vitesse-dark",
      },
      transformers: [legibleTokens, scrollTheCode],
    },
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Inter",
      cssVariable: "--font-inter",
      fallbacks: ["system-ui", "sans-serif"],
      options: {
        variants: [
          {
            weight: "100 900",
            style: "normal",
            src: ["./src/assets/fonts/InterVariable.woff2"],
          },
        ],
      },
    },
    // The italic is a family of its own, and only because <Font preload /> is
    // all-or-nothing across a family's variants. Declared beside the upright it
    // was preloaded with it: 388 KB fetched at the highest priority the browser
    // has, on every page, ahead of the LCP image — and the home page, /travel
    // and the wishlist contain not one <em>, <i> or <blockquote> between them.
    // Split out and left unpreloaded, it is fetched the ordinary way, which for
    // a webfont means only where text actually asks for it. The three places
    // that ask are in global.css and the post page; anything set in italic
    // without naming this variable gets the browser's synthetic slant instead,
    // so keep the two in step.
    {
      provider: fontProviders.local(),
      name: "Inter",
      cssVariable: "--font-inter-italic",
      fallbacks: ["system-ui", "sans-serif"],
      options: {
        variants: [
          {
            weight: "100 900",
            style: "italic",
            src: ["./src/assets/fonts/InterVariable-Italic.woff2"],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Fira Code",
      cssVariable: "--font-fira-code",
      fallbacks: ["ui-monospace", "monospace"],
      options: {
        variants: [
          {
            weight: "300 700",
            style: "normal",
            src: ["./src/assets/fonts/FiraCode-Variable.woff2"],
          },
        ],
      },
    },
  ],
  env: {
    schema: {
      // Turso. Optional because a non-production build never reads them — it
      // talks to the local SQLite file (see src/lib/db/index.ts) — while
      // migrations and scripts read them straight from process.env, outside
      // this schema, since they run without Astro.
      TURSO_DATABASE_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      TURSO_AUTH_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      CDN_DEV_DOMAIN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      CDN_DOMAIN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      // ISR Revalidation
      VERCEL_ISR_BYPASS_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      // Admin Panel - Passkey Auth
      ADMIN_SETUP_SECRET: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      ADMIN_SESSION_SECRET: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      ADMIN_RP_ID: envField.string({
        context: "server",
        access: "public",
        optional: true,
        default: "localhost",
      }),
      ADMIN_RP_NAME: envField.string({
        context: "server",
        access: "public",
        optional: true,
        default: "Wishlist Admin",
      }),
      // Cloudflare R2
      R2_ACCOUNT_ID: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      R2_ACCESS_KEY_ID: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      R2_SECRET_ACCESS_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      R2_BUCKET_NAME: envField.string({
        context: "server",
        access: "secret",
        optional: true,
        default: "wishlist-images",
      }),
    },
  },
});
