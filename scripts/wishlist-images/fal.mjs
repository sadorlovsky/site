/**
 * fal.ai adapter.
 *
 * These are image *edit* models, not text-to-image: the source photo goes in as a
 * reference and the model only restages it. No text-to-image model will reproduce
 * the sleeve art of a Three 6 Mafia LP or the label on a bag of salmiakki, so
 * editing an existing photo is the only route that keeps the product truthful.
 *
 * Model choice, roughly:
 *   nano-banana — best identity preservation when swapping background and light
 *   seedream    — sharper at 2K, the safer pick for flat cover art and fine label text
 *   kontext     — fallback; strong at "keep subject, change everything else"
 *
 * Endpoint paths and payload shapes move around as fal revises its catalogue. If a
 * call 422s, check the model's schema page and fix the adapter here — nothing else
 * in the pipeline knows about fal.
 */

const MODELS = {
  "nano-banana": {
    endpoint: "https://fal.run/fal-ai/nano-banana/edit",
    body: ({ prompt, imageUrl, variants }) => ({
      prompt,
      image_urls: [imageUrl],
      num_images: variants,
      output_format: "jpeg",
    }),
  },
  seedream: {
    endpoint: "https://fal.run/fal-ai/bytedance/seedream/v4/edit",
    body: ({ prompt, imageUrl, variants }) => ({
      prompt,
      image_urls: [imageUrl],
      image_size: { width: 2048, height: 1536 },
      num_images: variants,
    }),
  },
  kontext: {
    endpoint: "https://fal.run/fal-ai/flux-pro/kontext/max",
    body: ({ prompt, imageUrl, negativePrompt }) => ({
      prompt,
      image_url: imageUrl,
      aspect_ratio: "4:3",
      output_format: "jpeg",
      negative_prompt: negativePrompt,
    }),
  },
};

export const MODEL_NAMES = Object.keys(MODELS);

/**
 * Run one edit. Returns the generated image URLs (fal hosts them for a while, so
 * callers should download promptly rather than storing these).
 */
export async function generate({
  model,
  prompt,
  imageUrl,
  negativePrompt,
  variants = 1,
}) {
  const config = MODELS[model];
  if (!config) {
    throw new Error(`Unknown model "${model}". Available: ${MODEL_NAMES.join(", ")}`);
  }

  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is not set");

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config.body({ prompt, imageUrl, negativePrompt, variants })),
  });

  if (!response.ok) {
    throw new Error(`fal ${model} HTTP ${response.status}: ${await response.text()}`);
  }

  const body = await response.json();
  const urls = (body.images ?? []).map((image) => image.url).filter(Boolean);

  if (urls.length === 0) {
    throw new Error(`fal ${model} returned no images: ${JSON.stringify(body).slice(0, 300)}`);
  }

  return urls;
}
