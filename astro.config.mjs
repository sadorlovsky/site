import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel/static";
import icon from "astro-icon";
import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
  output: "static",
  adapter: vercel(),
  integrations: [icon(), mdx()],
  markdown: {
    shikiConfig: {
      theme: "catppuccin-macchiato",
    },
  },
});
