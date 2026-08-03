import { defineConfig, envField, fontProviders } from "astro/config";
import icon from "astro-icon";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import sitemap from "@astrojs/sitemap";
import db from "@astrojs/db";
import { loadEnv } from "vite";
import browserslist from "browserslist";
import { browserslistToTargets } from "lightningcss";

// Targets deliberately include Safari/iOS < 17.5 so Lightning CSS lowers
// light-dark() into @media (prefers-color-scheme) fallbacks at build time.
const cssTargets = browserslistToTargets(
  browserslist("defaults, Safari >= 15.4, iOS >= 15.4"),
);

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
    db(),
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
