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
    shikiConfig: {
      themes: {
        light: "catppuccin-latte",
        dark: "catppuccin-frappe",
      },
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
