/**
 * This script copies data files from src to public directory
 * to avoid maintaining duplicate files.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// Paths relative to project root
const SOURCE_FILE = "src/lib/travel/trips.json";
const DESTINATION_FILE = "public/trips.json";

// Ensure destination directory exists
const destDir = dirname(DESTINATION_FILE);
if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}

console.log(`Copying ${SOURCE_FILE} to ${DESTINATION_FILE}...`);
copyFileSync(SOURCE_FILE, DESTINATION_FILE);
console.log("Data files copied successfully!");
