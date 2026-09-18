/**
 * Stand-in for the real `suggest()` in `src/suggest.ts`.
 *
 * The real plugin sends `typed_so_far` plus every candidate to Jev (or an
 * Anthropic/Groq fallback) and gets back a `Choice` probability distribution
 * (which candidate) and a `Noul` (does anything plausibly complete this at
 * all). There's no backend here, so this file fakes both signals with a
 * small deterministic heuristic — substring position, word-boundary-aware
 * in-order matching (covers abbreviations), and whole-word overlap as a
 * last resort. Scores are the raw match quality, not a normalized
 * distribution: forcing candidate scores to sum to 1 (softmax-style) made an
 * isolated weak match look 100% confident whenever it was the only nonzero
 * candidate, which is worse than just showing the match quality directly.
 *
 * IMPORTANT — what's real and what's not: `selectCandidates()` and
 * `pickSuggestion()` (imported from `./suggest-core`, ported verbatim from
 * `src/suggest.ts`) are the *actual* prefix/fuzzy mode selection and gating
 * logic the shipped plugin uses. Only the ranking scores themselves are
 * fabricated. This demo is structurally honest about how guesswork decides
 * *whether* and *how* to show a suggestion; it is not a real model call, and
 * the specific scores it shows are not representative of any provider's
 * actual output.
 */
import {
  DEFAULT_GATES,
  pickSuggestion,
  selectCandidates,
  displayKind,
  type Candidate,
  type DisplayKind,
  type Suggestion,
} from "./suggest-core";

const WORD_BOUNDARY = /[\s/_-]/;

/**
 * Command-palette-style fuzzy match: `typed`'s characters must appear in
 * `command`, in order, but not necessarily contiguously. Matches score
 * higher when they land right after a word boundary (covers abbreviations
 * like `gst` -> `git status`, where 's' and 't' pick up right after each
 * word's start) or immediately follow the previous match (contiguous runs).
 * Returns 0 when `typed` isn't a subsequence of `command` at all.
 */
function fuzzyScore(typed: string, command: string): number {
  let ti = 0;
  let lastMatch = -2;
  let score = 0;
  for (let j = 0; j < command.length && ti < typed.length; j++) {
    if (command[j] !== typed[ti]) continue;
    let bonus = 1;
    if (j === lastMatch + 1) bonus += 1; // contiguous with the previous match
    if (j === 0 || WORD_BOUNDARY.test(command[j - 1]!)) bonus += 1; // starts a word
    score += bonus;
    lastMatch = j;
    ti++;
  }
  if (ti < typed.length) return 0; // not every typed char matched, in order
  return score / (typed.length * 3); // 3 = max possible bonus per char
}

/** Match quality in [0, 1] for one candidate. Higher = more plausibly what the user is typing. */
function matchQuality(typed: string, command: string): number {
  const t = typed.toLowerCase();
  const c = command.toLowerCase();
  if (t.length === 0) return 0;
  if (c.startsWith(t)) return 1;

  const idx = c.indexOf(t);
  if (idx > 0) return Math.max(0.6, 0.85 - idx * 0.01); // contiguous substring, later = slightly weaker

  const fuzzy = fuzzyScore(t, c);
  if (fuzzy > 0) return 0.35 + fuzzy * 0.45; // in-order/abbreviation match, e.g. "gst" ~ "git status"

  const typedWords = new Set(t.split(/\s+/).filter(Boolean));
  const commandWords = new Set(c.split(/\s+/).filter(Boolean));
  let shared = 0;
  for (const w of typedWords) if (commandWords.has(w)) shared++;
  if (shared > 0) return Math.min(0.25, (shared / typedWords.size) * 0.25);

  return 0;
}

export interface FakeSuggestion {
  command: string;
  score: number;
  kind: DisplayKind;
}

/**
 * Runs the real mode-selection + gating logic against a fabricated scoring
 * function in place of a live AI call. Returns undefined when nothing clears
 * the gate — exactly the case where the real plugin shows nothing either.
 */
export function fakeSuggest(typed: string, history: readonly string[]): FakeSuggestion | undefined {
  const trimmed = typed;
  if (trimmed.length === 0) return undefined;

  const { mode, candidates } = selectCandidates(trimmed, history);
  if (candidates.length === 0) return undefined;

  // Mirrors suggest()'s shortcut in src/suggest.ts: a single literal prefix
  // match needs no ranking at all.
  if (mode === "prefix" && candidates.length === 1) {
    const only = candidates[0]!;
    const suggestion: Suggestion = { command: only.command, score: 1, isPrefix: true };
    return { command: suggestion.command, score: suggestion.score, kind: displayKind(suggestion) };
  }

  const ranked: Suggestion[] = candidates
    .map((c: Candidate) => ({
      command: c.command,
      score: matchQuality(trimmed, c.command),
      isPrefix: c.command.startsWith(trimmed),
    }))
    .sort((a, b) => b.score - a.score);

  // No independent Noul question here, so reuse the top candidate's own
  // match quality as the "does anything plausibly complete this" signal.
  const hasCompletion = ranked[0]?.score ?? 0;

  const picked = pickSuggestion({ mode, hasCompletion, ranked }, DEFAULT_GATES);
  if (!picked) return undefined;

  return { command: picked.command, score: picked.score, kind: displayKind(picked) };
}
