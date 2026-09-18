import { test } from "node:test";
import assert from "node:assert/strict";
import { formatForShell, suggestionKind } from "./cli.ts";
import type { Suggestion } from "./suggest.ts";

const suggestion = (over: Partial<Suggestion> = {}): Suggestion => ({
  command: "pnpm db:migrate",
  score: 0.8,
  isPrefix: false,
  ...over,
});

test("suggestionKind: a candidate sourced from project scripts is 'script' even if it's also a literal prefix match", () => {
  const scripts = new Set(["pnpm db:migrate"]);
  assert.equal(suggestionKind(suggestion({ isPrefix: true }), scripts), "script");
  assert.equal(suggestionKind(suggestion({ isPrefix: false }), scripts), "script");
});

test("suggestionKind: falls back to prefix/replace for history-sourced candidates", () => {
  const scripts = new Set<string>();
  assert.equal(suggestionKind(suggestion({ isPrefix: true }), scripts), "prefix");
  assert.equal(suggestionKind(suggestion({ isPrefix: false }), scripts), "replace");
});

test("formatForShell's header line carries the 'script' kind for untried project-script commands", () => {
  const scripts = new Set(["pnpm db:migrate"]);
  const header = formatForShell(suggestion(), 0.9, scripts).split("\n")[0];
  assert.equal(header, "0.800 0.900 script");
});

test("formatForShell defaults to prefix/replace when no script set is given (back-compat)", () => {
  const header = formatForShell(suggestion({ isPrefix: true }), 0.9).split("\n")[0];
  assert.equal(header, "0.800 0.900 prefix");
});
