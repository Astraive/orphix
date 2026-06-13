import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const platform = process.platform;
const ext = platform === "win32" ? ".exe" : "";
const binaryName = `orphix-core${ext}`;

const srcDir = join(import.meta.dirname, "..", "target", "debug");
const destDir = join(import.meta.dirname, "..", "target", "orphix-core-dev", "debug");

const src = join(srcDir, binaryName);
const dest = join(destDir, binaryName);

if (!existsSync(src)) {
  console.error(`Binary not found: ${src}`);
  console.error("Run `cargo build -p orphix-core` first.");
  process.exit(1);
}

if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}

copyFileSync(src, dest);
console.log(`Copied ${binaryName} → ${dest}`);
