// `astro db` dispatch is missing from astro 7's CLI, so drive @astrojs/db's own
// cli() directly with the same {flags, config} shape it expects.
import { pathToFileURL } from "node:url";
// Relative path because the package's "exports" map doesn't expose this file.
import { cli } from "../node_modules/@astrojs/db/dist/core/cli/index.js";

const root = pathToFileURL(`${process.cwd()}/`);
const flags = { _: [null, null, "db", "push"], remote: true };

await cli({ flags, config: { root, integrations: [] } });
