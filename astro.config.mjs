import { defineConfig } from "astro/config";
import icon from "astro-icon";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  output: "static",
  integrations: [icon(), mdx(), react()],
  markdown: {
    shikiConfig: {
      theme: "catppuccin-macchiato",
    },
  },
});
