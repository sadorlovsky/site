import { defineConfig } from "astro/config";
import icon from "astro-icon";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import db from "@astrojs/db";

// https://astro.build/config
export default defineConfig({
  output: "static",
  adapter: vercel(),
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
});
