import { defineConfig, envField, fontProviders } from "astro/config";
import icon from "astro-icon";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import sitemap from "@astrojs/sitemap";
import { loadEnv } from "vite";
import browserslist from "browserslist";
import { browserslistToTargets } from "lightningcss";

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

/** #rgb, #rrggbb and #rrggbbaa, composited over the ground it will sit on. */
function readColor(hex, ground) {
  const raw = hex.replace("#", "");
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
      .replace(/(^|;)\s*color:\s*(#[0-9a-fA-F]{3,8})/g, (_m, lead, hex) =>
        `${lead}color:${legible(hex, "light")}`,
      )
      .replace(/--shiki-dark:\s*(#[0-9a-fA-F]{3,8})/g, (_m, hex) =>
        `--shiki-dark:${legible(hex, "dark")}`,
      );
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
      transformers: [legibleTokens],
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
