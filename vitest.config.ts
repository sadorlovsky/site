import { getViteConfig } from "astro/config";

export default getViteConfig({
  // @ts-expect-error - vitest types not fully compatible with astro config
  test: {
    // Vitest configuration options
  },
});
