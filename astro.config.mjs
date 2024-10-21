import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel/static";
import icon from "astro-icon";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  output: "static",
  adapter: vercel(),
  integrations: [icon(), mdx(), react()],
  markdown: {
    shikiConfig: {
      theme: "catppuccin-macchiato",
    },
  },
  experimental: {
    contentLayer: true,
  },
});
