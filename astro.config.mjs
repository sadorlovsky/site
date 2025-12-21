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
  integrations: [icon(), mdx(), react(), db()],
  markdown: {
    shikiConfig: {
      theme: "catppuccin-macchiato",
    },
  },
});
