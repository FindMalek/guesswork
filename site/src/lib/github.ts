import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = "findmalek/guesswork";

/**
 * The zsh plugin's own version (repo root package.json), not this Next.js
 * app's -- they're separate packages and can drift independently. Read via
 * fs rather than a cross-package import so the site keeps its own
 * self-contained module graph. `process.cwd()` is the `site/` directory in
 * both `next dev` and `next build`, so the repo root is one level up.
 */
export function getPluginVersion(): string {
  try {
    const raw = readFileSync(join(process.cwd(), "..", "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Live star count for the header badge. Returns null on any failure
 * (rate limit, offline build, network hiccup) so the header can render
 * without it rather than show a fabricated number.
 */
export async function getRepoStars(): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: number };
    return typeof data.stargazers_count === "number" ? data.stargazers_count : null;
  } catch {
    return null;
  }
}
