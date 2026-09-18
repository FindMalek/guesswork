/**
 * Ported, as-is, from `src/suggest.ts` at the repo root.
 *
 * Everything below this line up to `pickSuggestion` is pure TypeScript with
 * no Node-only APIs — it's the part of the real plugin that decides *which
 * mode* (prefix vs. fuzzy) applies and *whether* a candidate clears the
 * display gate. None of it talks to a model; that happens in `suggest()`
 * back in the real file, which is deliberately NOT ported here (it needs a
 * live TypeSafe/Anthropic/Groq call). See `../lib/fake-rank.ts` for what
 * replaces it in this playground: a small deterministic scoring stand-in,
 * not a real AI call. Keep this file's logic identical to the source it was
 * copied from — if `src/suggest.ts` changes, re-sync by hand.
 */

export interface Candidate {
  id: string;
  command: string;
}

export interface Suggestion {
  command: string;
  /** Match quality assigned to this candidate (0..1). Real plugin: Jev's probability. Here: the fake-rank score. */
  score: number;
  /** True when `command` literally starts with the typed text. */
  isPrefix: boolean;
}

/**
 * `prefix`: some history entries literally start with the typed text; only those
 * were ranked. `fuzzy`: none did, so every recent command was ranked and the
 * caller should gate on `hasCompletion` and the top score.
 */
export type Mode = "prefix" | "fuzzy";

export interface SuggestResult {
  mode: Mode;
  /** Probability (real) / heuristic confidence (fake) that at least one candidate completes the typed text. */
  hasCompletion: number;
  /** All candidates, highest score first. */
  ranked: Suggestion[];
}

export interface Gates {
  /** Fuzzy mode: minimum `hasCompletion` to suggest. */
  threshold: number;
  /** Fuzzy mode: minimum score of the top candidate to suggest. */
  minScore: number;
  /**
   * Fuzzy mode: a top score at or above this overrides a borderline
   * `hasCompletion`. The two signals are jagged in different places — on
   * small histories `hasCompletion` under-fires for real matches while the
   * top score is decisive; on nonsense the scores spread out while
   * `hasCompletion` is near 0 — so both are used.
   */
  strongScore: number;
}

export const DEFAULT_GATES: Gates = { threshold: 0.5, minScore: 0.3, strongScore: 0.9 };

/** The top candidate to show, or undefined when nothing clears the gates. */
export function pickSuggestion(result: SuggestResult, gates: Gates = DEFAULT_GATES): Suggestion | undefined {
  const top = result.ranked[0];
  if (top === undefined) return undefined;
  if (result.mode === "prefix") return top;
  if (top.score < gates.minScore) return undefined;
  if (result.hasCompletion >= gates.threshold || top.score >= gates.strongScore) return top;
  return undefined;
}

export function candidateId(index: number): string {
  return `C${String(index).padStart(2, "0")}`;
}

export interface CandidateOptions {
  /** When false, never narrow to literal prefix matches; rank everything. */
  prefixFilter?: boolean;
}

/**
 * Choose which recent commands (newest first) should be ranked. Literal
 * prefix matching is an exact rule, so code applies it: if any command
 * starts with `typed`, only those are candidates. The command equal to
 * `typed` is never a candidate since there is nothing left to complete.
 */
export function selectCandidates(
  typed: string,
  commands: readonly string[],
  options: CandidateOptions = {},
): { mode: Mode; candidates: Candidate[] } {
  const rest = commands.filter((command) => command !== typed);
  const prefixed = options.prefixFilter === false ? [] : rest.filter((command) => command.startsWith(typed));
  const chosen = prefixed.length > 0 ? prefixed : rest;
  return {
    mode: prefixed.length > 0 ? "prefix" : "fuzzy",
    candidates: chosen.map((command, index) => ({ id: candidateId(index), command })),
  };
}

/**
 * Mirrors `suggestionKind()` in `src/cli.ts`: the zsh plugin renders
 * `prefix` suggestions as a plain completion and everything else (`replace`
 * in the real plugin; the `script` kind doesn't apply here — this demo has
 * no package.json/Makefile) with a `⇢` marker. This playground only ever
 * produces `prefix` or `replace`.
 */
export type DisplayKind = "prefix" | "replace";

export function displayKind(s: Suggestion): DisplayKind {
  return s.isPrefix ? "prefix" : "replace";
}
