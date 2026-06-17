import { existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const distDir = path.resolve("dist");

if (!existsSync(distDir)) {
  process.exit(0);
}

for (const entry of readdirSync(distDir, { withFileTypes: true })) {
  if (entry.name === ".git") continue;
  rmSync(path.join(distDir, entry.name), {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100
  });
}
