#!/bin/bash

# Revalidate Vercel ISR cache for wishlist pages
# Usage: ./scripts/revalidate-wishlist.sh <base_url> <token>
# Example: ./scripts/revalidate-wishlist.sh https://orlovsky.dev your-token

BASE_URL="${1:-https://orlovsky.dev}"
TOKEN="${2:-$VERCEL_ISR_BYPASS_TOKEN}"

if [ -z "$TOKEN" ]; then
  echo "Error: Token is required"
  echo "Usage: $0 <base_url> <token>"
  echo "   or: VERCEL_ISR_BYPASS_TOKEN=xxx $0 <base_url>"
  exit 1
fi

PAGES=(
  "/wishlist"
  "/wishlist/clothing"
  "/wishlist/home"
  "/wishlist/sweets"
  "/wishlist/vinyl"
  "/wishlist/blu-ray"
  "/wishlist/books"
  "/wishlist/merch"
  "/wishlist/other"
)

echo "Revalidating wishlist pages on $BASE_URL"
echo "---"

for page in "${PAGES[@]}"; do
  url="${BASE_URL}${page}"
  status=$(curl -s -o /dev/null -w "%{http_code}" -I -H "x-prerender-revalidate: $TOKEN" "$url")
  echo "$page -> $status"
done

echo "---"
echo "Done"
