import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

/**
 * Turns "things you could run in this project but have never actually typed"
 * (package.json scripts, Makefile targets) into candidates for suggest.ts's
 * existing ranking pipeline. This module only discovers and formats commands;
 * it knows nothing about ranking, gating, or the model — those stay exactly
 * as they are for history-sourced candidates (see cli.ts for how the two
 * lists are merged).
 */

export type ProjectScriptSource = "package.json" | "Makefile";

export interface ProjectScript {
  /** The literal command a user would type, e.g. "pnpm db:migrate" or "make build". */
  command: string;
  source: ProjectScriptSource;
}

type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

interface PackageJsonShape {
  scripts?: Record<string, string>;
  packageManager?: string;
}

/**
 * Walk up from `startDir` looking for the nearest ancestor directory that has
 * a package.json and/or a Makefile, and stop there — a package inside a
 * monorepo should win over the repo root above it, the same way npm/pnpm/yarn
 * themselves resolve "the project you're in".
 *
 * The walk gives up (returns undefined) once it reaches `homeDir` (default:
 * the real home directory) or the filesystem root, whichever comes first.
 * Without a boundary, running guesswork from some random deeply-nested
 * directory outside any project would walk dozens of levels doing I/O on
 * every keystroke for nothing, and could even surface an unrelated
 * package.json sitting directly in $HOME as if it were "the project".
 * `homeDir` is a parameter (not just `os.homedir()` inline) so tests can pick
 * an arbitrary boundary without touching the real home directory.
 */
export function findProjectDir(startDir: string, homeDir: string = homedir()): string | undefined {
  let dir = resolve(startDir);
  const boundary = resolve(homeDir);
  for (;;) {
    if (existsSync(join(dir, "package.json")) || existsSync(join(dir, "Makefile"))) return dir;
    if (dir === boundary) return undefined;
    const parent = dirname(dir);
    if (parent === dir) return undefined; // reached the filesystem root
    dir = parent;
  }
}

/**
 * Package manager priority matches how real tooling resolves it: the
 * package.json's own `packageManager` field (Corepack's mechanism) is
 * authoritative when present, since it's an explicit declaration rather than
 * a guess. Otherwise fall back to sniffing the lockfile that would actually
 * be used to install, in the order most projects would expect: pnpm, then
 * yarn, then bun, defaulting to npm when none of those are present.
 */
export function detectPackageManager(dir: string, pkg?: Pick<PackageJsonShape, "packageManager">): PackageManager {
  const declared = pkg?.packageManager?.split("@")[0]?.trim();
  if (declared === "pnpm" || declared === "yarn" || declared === "bun" || declared === "npm") return declared;

  if (existsSync(join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(dir, "yarn.lock"))) return "yarn";
  if (existsSync(join(dir, "bun.lockb"))) return "bun";
  return "npm";
}

export function formatScriptCommand(pm: PackageManager, scriptName: string): string {
  switch (pm) {
    case "pnpm":
      return `pnpm ${scriptName}`;
    case "yarn":
      return `yarn ${scriptName}`;
    case "bun":
      return `bun run ${scriptName}`;
    case "npm":
      return `npm run ${scriptName}`;
  }
}

/** Reads `dir`/package.json's `scripts`, or `[]` if there is none or it's unparseable. */
export function readPackageScripts(dir: string): ProjectScript[] {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) return [];

  let pkg: PackageJsonShape;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as PackageJsonShape;
  } catch {
    return []; // malformed package.json shouldn't take down suggestions
  }

  const scripts = pkg.scripts;
  if (!scripts || typeof scripts !== "object") return [];

  const pm = detectPackageManager(dir, pkg);
  return Object.keys(scripts).map((name) => ({ command: formatScriptCommand(pm, name), source: "package.json" as const }));
}

/**
 * Matches a Makefile line that starts a target: a run of word characters,
 * dots, slashes, or hyphens, starting with a letter or digit, followed by a
 * colon that isn't `:=` (a variable assignment, not a target). Requiring the
 * first character to be alphanumeric already excludes special targets like
 * `.PHONY`, `.DEFAULT_GOAL`, etc. — they start with `.`.
 *
 * This intentionally does not try to be a full Makefile parser: pattern
 * rules (`%.o: %.c`), multiple targets on one line (`foo bar: baz`), and
 * variables used in target names are all left alone rather than guessed at.
 */
const MAKE_TARGET = /^([A-Za-z0-9][\w./-]*)\s*:(?!=)/;

export function parseMakefileTargets(text: string): string[] {
  const targets: string[] = [];
  const seen = new Set<string>();
  for (const line of text.split("\n")) {
    const match = MAKE_TARGET.exec(line);
    if (!match) continue;
    const name = match[1]!;
    if (seen.has(name)) continue;
    seen.add(name);
    targets.push(name);
  }
  return targets;
}

/** Reads `dir`/Makefile's targets, or `[]` if there is none or it's unreadable. */
export function readMakefileTargets(dir: string): ProjectScript[] {
  const makePath = join(dir, "Makefile");
  if (!existsSync(makePath)) return [];

  let text: string;
  try {
    text = readFileSync(makePath, "utf-8");
  } catch {
    return [];
  }

  return parseMakefileTargets(text).map((name) => ({ command: `make ${name}`, source: "Makefile" as const }));
}

export interface ProjectScriptOptions {
  /** Command strings to leave out, e.g. ones already present in shell history. */
  exclude?: ReadonlySet<string>;
  /** Overrides the home-directory boundary used by findProjectDir (for tests). */
  homeDir?: string;
}

/**
 * The full set of project-script candidates for `startDir`: package.json
 * scripts and Makefile targets from the nearest ancestor project directory,
 * each read and parsed exactly once. Deduplication against history is the
 * caller's job in principle, but `exclude` is accepted here so cli.ts can do
 * it in the same pass instead of building a second list just to filter it.
 */
export function projectScriptCandidates(startDir: string, options: ProjectScriptOptions = {}): ProjectScript[] {
  const dir = findProjectDir(startDir, options.homeDir);
  if (!dir) return [];

  const all = [...readPackageScripts(dir), ...readMakefileTargets(dir)];
  return options.exclude ? all.filter((s) => !options.exclude!.has(s.command)) : all;
}
