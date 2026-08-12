---
version: 1
slug: "src-pages-blog-index-astro"
primary_target: "src/pages/blog/index.astro"
related_targets: ["src/pages/blog/[...slug].astro","src/components/blog/PostContents.astro","src/components/blog/PostRow.astro","src/components/blog/PostLead.astro"]
---

# /blog — surface brief

## Scope and mode

The blog index and the post page. Mode: **Read** — the visitor is here to find
and understand something, not to be sold or to operate a tool.

## Audience and job

The index's primary reader is a **returning** one, hunting a post they half
remember; the secondary is a developer who arrived from a link or a search. The
index's job is scanning, so density, stable lanes and landmarks outrank
expression. The post page's job is the reading itself, plus knowing where you
are inside a long one and how to get back out.

## Chosen directions

Two surface rolls, both inside the site's committed world.

**The index** — masthead, recent band, compressed archive (seed `2e7c45c0`,
assigned candidate 6). Three newest posts get room and a description, the
newest at headline scale; everything older is a ledger row under a sticky year,
with date, title, tags and reading time in lanes. The two materials are
deliberately far apart in scale.

**The post page** — the apparatus in the margin (seed `81a724d1`, assigned
candidate 3). The contents leaves the flow above 1200px and stands in the left
margin, marking the section being read. Below that it is a landmark and a list,
capped so a long contents cannot eat the screen.

## What the post page's redesign actually fixed

It was the only room on the site with no chrome: its pills scrolled away and
nothing came back, no veil, no landmark ever docked. That absence — not the
type or the colour — was what made it read as a different site. It now uses the
same `condenseOnScroll` header as /travel and the index, and the condensed
title pill replaced a floating back-to-top disc that belonged to no other part
of the vocabulary.

Code blocks were the second foreign world: Catppuccin's grounds (#eff1f5 and
#303446) against a ghost-white and warm-near-black site. Shiki now runs
Vitesse, and the ground is repainted to the site's own recess in global.css, so
a listing reads as a hollow in the page rather than a card from elsewhere.

## Memorable moments

Index: the step in scale between the band and the ledger — a headline-sized
lead against 0.85rem rows in tabular lanes. Post: the margin apparatus tracking
the reader, and the language label and copy button trading one corner between
them.

## Constraints this surface keeps

- Both languages are full sibling sections toggled by `html.lang-ru` on the
  index; a post is served in one language and links to its translation.
- The reading column is 800px on both surfaces, `box-sizing: border-box`, so
  navigating between them never shifts the page sideways.
- The ambient blobs live outside `<main>` on both. They were inside it, which
  forced `overflow: hidden` and made every `position: sticky` on the page stick
  to that box instead of the viewport.
- 1200px is the site's fifth breakpoint and its only wide one. It was argued
  for and recorded in DESIGN.md; it exists because the margin apparatus asks
  "is there room to spare", which is not a question the other four answer.

## Unresolved

- The post's h2 sections are not sticky landmarks. Without a per-section
  wrapper each stuck heading paints over the last, and the wrapper needs a
  rehype plugin; the margin apparatus answers "where am I" instead.
- The 15 post descriptions are authored and awaiting the user's proofread.
- No tag filtering anywhere: the tag legend was built, then removed at the
  user's request. Tags stay as metadata on rows, leads and colophons.
