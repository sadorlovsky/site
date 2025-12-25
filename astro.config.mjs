import { defineConfig, envField } from "astro/config";
import icon from "astro-icon";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import db from "@astrojs/db";
import { loadEnv } from "vite";

const { VERCEL_ISR_BYPASS_TOKEN } = loadEnv(
  process.env.NODE_ENV,
  process.cwd(),
  "",
);

// https://astro.build/config
export default defineConfig({
  output: "static",
  adapter: vercel({
    isr: {
      // caches all pages on first request and saves for 1 day
      expiration: 60 * 60 * 24,
      bypassToken: VERCEL_ISR_BYPASS_TOKEN,
    },
  }),
  image: {
    domains: [
      "pub-4b913e87f0c44d508111225ea44c624f.r2.dev", // R2 dev
      // TODO: добавить production домен
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
      CDN_DEV_URL: envField.string({ context: "server", access: "secret" }),
    },
  },
});
