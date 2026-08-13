/**
 * Turning one uploaded photograph into the set of files the page will serve.
 *
 * This is the whole of the resizing this site does at runtime, and it runs once
 * per upload rather than once per request — see the note at the top of
 * lib/images.ts for what that replaced.
 *
 * Deliberately free of `astro:env`: the admin upload route reaches it through
 * an Astro request, and scripts/images/backfill.ts reaches it from bun with
 * credentials out of `process.env`. Neither runtime is allowed to be assumed
 * here, so nothing in this file reads configuration at all — callers pass the
 * bytes in and get bytes back.
 */

import sharp from "sharp";
import {
  IMAGE_QUALITY,
  IMAGE_WIDTHS,
  derivativeKey,
  heightFor,
} from "../images";

export interface Derivative {
  key: string;
  width: number;
  /** An ArrayBuffer rather than sharp's Buffer: Node pools those, so one is a
      window onto a larger allocation, and both callers hand it straight to
      fetch as a request body. */
  body: ArrayBuffer;
}

/**
 * Every width of one photograph, cropped to the card's 4:3 frame and encoded
 * webp.
 *
 * `rotate()` with no argument applies whatever the EXIF orientation says and
 * then drops the tag, which is the difference between a photograph taken on a
 * phone arriving upright and arriving on its side — sharp does not honour the
 * tag implicitly, and the crop below would otherwise take the wrong slice.
 *
 * Enlargement is allowed on purpose. A source narrower than 1024 would
 * otherwise be written short under a key the markup advertises as `1024w`, and
 * a srcset that lies is worse than a few kilobytes of upscale — the browser
 * picks by the descriptor, not by what arrives.
 */
export async function deriveWebp(
  source: ArrayBuffer | Uint8Array,
  key: string,
): Promise<Derivative[]> {
  const input = Buffer.from(
    source instanceof Uint8Array ? source : new Uint8Array(source),
  );
  // One decode, four encodes: clone() forks the pipeline after the source has
  // been read rather than handing the same bytes to sharp four times.
  const image = sharp(input).rotate();

  return Promise.all(
    IMAGE_WIDTHS.map(async (width) => ({
      key: derivativeKey(key, width),
      width,
      body: new Uint8Array(
        await image
          .clone()
          .resize({ width, height: heightFor(width), fit: "cover" })
          .webp({ quality: IMAGE_QUALITY })
          .toBuffer(),
      ).buffer,
    })),
  );
}
