import type { CollectionEntry } from "astro:content";

type BlogPost = CollectionEntry<"blog">;

/**
 * Get effective pubDate for a blog post.
 * For translations, returns the pubDate from the original post.
 */
export function getEffectivePubDate(
  post: BlogPost,
  allPosts: BlogPost[]
): Date {
  if (post.data.pubDate) return post.data.pubDate;
  if (post.data.translationOf) {
    const original = allPosts.find((p) => p.id === post.data.translationOf);
    if (original?.data.pubDate) return original.data.pubDate;
  }
  return new Date();
}
