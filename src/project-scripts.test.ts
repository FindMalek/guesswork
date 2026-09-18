import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  detectPackageManager,
  findProjectDir,
  formatScriptCommand,
  parseMakefileTargets,
  projectScriptCandidates,
  readMakefileTargets,
  readPackageScripts,
} from "./project-scripts.ts";

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), "guesswork-scripts-"));
}

test("findProjectDir finds a package.json in the starting directory", () => {
  const dir = tmpDir();
  writeFileSync(join(dir, "package.json"), "{}");
  assert.equal(findProjectDir(dir, dir), dir);
});

test("findProjectDir walks up to an ancestor that has package.json or Makefile", () => {
  const root = tmpDir();
  const nested = join(root, "a", "b", "c");
  mkdirSync(nested, { recursive: true });
  writeFileSync(join(root, "Makefile"), "build:\n\techo hi\n");
  assert.equal(findProjectDir(nested, root), root);
});

test("findProjectDir stops at the given home boundary without finding anything above it", () => {
  const root = tmpDir();
  const home = join(root, "home");
  const nested = join(home, "project");
  mkdirSync(nested, { recursive: true });
  // A package.json sitting above the home boundary must not be picked up.
  writeFileSync(join(root, "package.json"), "{}");
  assert.equal(findProjectDir(nested, home), undefined);
});

test("findProjectDir returns undefined when neither file exists anywhere up to the boundary", () => {
  const root = tmpDir();
  const nested = join(root, "x", "y");
  mkdirSync(nested, { recursive: true });
  assert.equal(findProjectDir(nested, root), undefined);
});

test("detectPackageManager prefers the packageManager field over lockfiles", () => {
  const dir = tmpDir();
  writeFileSync(join(dir, "pnpm-lock.yaml"), "");
  assert.equal(detectPackageManager(dir, { packageManager: "yarn@4.1.0" }), "yarn");
});

test("detectPackageManager falls back to lockfile sniffing in pnpm > yarn > bun order", () => {
  const pnpmDir = tmpDir();
  writeFileSync(join(pnpmDir, "pnpm-lock.yaml"), "");
  assert.equal(detectPackageManager(pnpmDir), "pnpm");

  const yarnDir = tmpDir();
  writeFileSync(join(yarnDir, "yarn.lock"), "");
  assert.equal(detectPackageManager(yarnDir), "yarn");

  const bunDir = tmpDir();
  writeFileSync(join(bunDir, "bun.lockb"), "");
  assert.equal(detectPackageManager(bunDir), "bun");
});

test("detectPackageManager defaults to npm when nothing else is present", () => {
  assert.equal(detectPackageManager(tmpDir()), "npm");
});

test("formatScriptCommand formats each package manager's run syntax", () => {
  assert.equal(formatScriptCommand("npm", "build"), "npm run build");
  assert.equal(formatScriptCommand("pnpm", "build"), "pnpm build");
  assert.equal(formatScriptCommand("yarn", "build"), "yarn build");
  assert.equal(formatScriptCommand("bun", "build"), "bun run build");
});

test("readPackageScripts reads scripts and formats them with the detected package manager", () => {
  const dir = tmpDir();
  writeFileSync(join(dir, "pnpm-lock.yaml"), "");
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ scripts: { build: "tsc", "db:migrate": "prisma migrate dev" } }),
  );
  assert.deepEqual(readPackageScripts(dir), [
    { command: "pnpm build", source: "package.json" },
    { command: "pnpm db:migrate", source: "package.json" },
  ]);
});

test("readPackageScripts returns an empty list when there's no package.json, no scripts, or invalid JSON", () => {
  assert.deepEqual(readPackageScripts(tmpDir()), []);

  const noScripts = tmpDir();
  writeFileSync(join(noScripts, "package.json"), JSON.stringify({ name: "x" }));
  assert.deepEqual(readPackageScripts(noScripts), []);

  const malformed = tmpDir();
  writeFileSync(join(malformed, "package.json"), "{ not json");
  assert.deepEqual(readPackageScripts(malformed), []);
});

test("parseMakefileTargets matches simple targets and skips recipes, PHONY, and variable assignments", () => {
  const text = [
    ".PHONY: build test",
    "build: src/index.ts",
    "\techo building",
    "test:",
    "\tnpm test",
    "CC := gcc",
    "FOO = bar",
    "clean:",
    "clean:", // repeated declaration, should only appear once
    "\trm -rf dist",
  ].join("\n");
  assert.deepEqual(parseMakefileTargets(text), ["build", "test", "clean"]);
});

test("parseMakefileTargets ignores pattern rules and multi-target lines it can't confidently parse", () => {
  const text = ["%.o: %.c", "\tcc -c $<", "foo bar: baz", "\techo hi"].join("\n");
  assert.deepEqual(parseMakefileTargets(text), []);
});

test("readMakefileTargets formats targets as make commands, or [] when there's no Makefile", () => {
  const dir = tmpDir();
  writeFileSync(join(dir, "Makefile"), "build:\n\techo hi\ndeploy:\n\techo deploying\n");
  assert.deepEqual(readMakefileTargets(dir), [
    { command: "make build", source: "Makefile" },
    { command: "make deploy", source: "Makefile" },
  ]);
  assert.deepEqual(readMakefileTargets(tmpDir()), []);
});

test("projectScriptCandidates combines package.json scripts and Makefile targets from the nearest project dir", () => {
  const dir = tmpDir();
  writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { build: "tsc" } }));
  writeFileSync(join(dir, "Makefile"), "deploy:\n\techo deploying\n");
  assert.deepEqual(projectScriptCandidates(dir, { homeDir: dir }), [
    { command: "npm run build", source: "package.json" },
    { command: "make deploy", source: "Makefile" },
  ]);
});

test("projectScriptCandidates excludes commands already present elsewhere (e.g. shell history)", () => {
  const dir = tmpDir();
  writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { build: "tsc", test: "vitest" } }));
  const result = projectScriptCandidates(dir, { homeDir: dir, exclude: new Set(["npm run test"]) });
  assert.deepEqual(result, [{ command: "npm run build", source: "package.json" }]);
});

test("projectScriptCandidates returns [] when no project directory is found within the boundary", () => {
  const root = tmpDir();
  const nested = join(root, "a", "b");
  mkdirSync(nested, { recursive: true });
  assert.deepEqual(projectScriptCandidates(nested, { homeDir: root }), []);
});
