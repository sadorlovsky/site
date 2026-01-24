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
  output: "static",
  adapter: vercel({
    isr: {
      // Bypass token for on-demand revalidation
      bypassToken: VERCEL_ISR_BYPASS_TOKEN,
      // Exclude API routes and dynamic pages from ISR
      exclude: [/^\/api\/.*/],
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
      CDN_DOMAIN: envField.string({ context: "server", access: "secret" }),
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
