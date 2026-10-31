#!/bin/sh

# Vercel's install step. Installs from scratch whenever bun.lock has changed
# since the build cache was written, and on top of the cache otherwise.
#
# Vercel restores node_modules from the previous deployment and runs
# `bun install` over it. When that install moves a package to a new version,
# bun 1.3 can drop the package's own nested node_modules: @vercel/nft 1.10 →
# 1.11 lost its private estree-walker 2, its require() then found the
# ESM-only estree-walker 3 at the top level, and the build died in the Vercel
# adapter's astro:build:done hook. A clean install lays the tree out exactly
# as bun.lock says, so it is paid for only when bun.lock says something new.

set -e

STAMP=node_modules/.bun-lock-cksum

if [ "$(cksum < bun.lock)" != "$(cat "$STAMP" 2>/dev/null)" ]; then
  echo "bun.lock changed since the cached install — installing from scratch"
  rm -rf node_modules
fi

bun install
cksum < bun.lock > "$STAMP"
