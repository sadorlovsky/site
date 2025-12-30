import { defineConfig, envField } from "astro/config";
import icon from "astro-icon";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import db from "@astrojs/db";
import { loadEnv } from "vite";

const { VERCEL_ISR_BYPASS_TOKEN, CDN_URL, CDN_DEV_URL } = loadEnv(
  process.env.NODE_ENV,
  process.cwd(),
  "",
);

const isProd = process.env.NODE_ENV === "production";
const cdnDomain = isProd ? CDN_URL : CDN_DEV_URL;

// https://astro.build/config
export default defineConfig({
  output: "static",
  adapter: vercel(),
  image: {
    domains: [
      "pub-4b913e87f0c44d508111225ea44c624f.r2.dev", // R2 dev
      "cdn.orlovsky.dev", // R2 production
    ],
  },
  integrations: [icon(), mdx(), react(), db()],
  markdown: {
    shikiConfig: {
      theme: "catppuccin-macchiato",
    },
  },
  env: {
    schema: {
      CDN_DEV_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      CDN_URL: envField.string({ context: "server", access: "secret" }),
    },
  },
});
