import { defineConfig, envField, fontProviders } from "astro/config";
import icon from "astro-icon";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import db from "@astrojs/db";
import { loadEnv } from "vite";

const { VERCEL_ISR_BYPASS_TOKEN, CDN_DOMAIN, CDN_DEV_DOMAIN } = loadEnv(
  process.env.NODE_ENV,
  process.cwd(),
  "",
);

const isProd = process.env.NODE_ENV === "production";
const cdnDomain = isProd ? CDN_DOMAIN : CDN_DEV_DOMAIN;

// https://astro.build/config
export default defineConfig({
  site: "https://orlovsky.dev",
  output: "server",
  vite: {
    optimizeDeps: {
      exclude: ["@simplewebauthn/server"],
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
    domains: [cdnDomain],
  },
  integrations: [icon(), mdx(), react(), db()],
  markdown: {
    shikiConfig: {
      theme: "catppuccin-macchiato",
    },
  },
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
  experimental: {
    contentIntellisense: true,
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
    ],
  },
});
