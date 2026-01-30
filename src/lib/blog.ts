import type { CollectionEntry } from "astro:content";

type BlogPost = CollectionEntry<"blog">;

/**
 * Get effective pubDate for a blog post.
 * For translations, returns the pubDate from the original post.
 */
export function getEffectivePubDate(
  post: BlogPost,
  allPosts: BlogPost[],
): Date {
  if (post.data.pubDate) return post.data.pubDate;
  if (post.data.translationOf) {
    const original = allPosts.find((p) => p.id === post.data.translationOf);
    if (original?.data.pubDate) return original.data.pubDate;
  }
  return new Date();
}

/**
 * Calculate reading time for a blog post.
 * Returns time in minutes (minimum 1).
 */
export function getReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const text = content
    .replace(/```[\s\S]*?```/g, "") // remove code blocks
    .replace(/`[^`]*`/g, "") // remove inline code
    .replace(/import\s+.*?;?\n/g, "") // remove imports
    .replace(/<[^>]*>/g, "") // remove HTML/JSX tags
    .replace(/[#*_~`>\-|]/g, "") // remove markdown syntax
    .trim();
  const words = text.split(/\s+/).filter((word) => word.length > 0).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}
