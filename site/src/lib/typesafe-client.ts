import "server-only";
import { choice, noul, TypeSafeClient } from "@typesafe-ai/sdk";
import type { Candidate, Suggestion } from "./suggest-core";
import { env } from "@/env";

/**
 * Real Jev call for the terminal playground -- the request shape (the
 * Choice + Noul pair, the prompt text, the field names) is copied verbatim
 * from `src/suggest.ts` at the repo root, which is what the actual zsh
 * plugin sends. `selectCandidates`/`pickSuggestion` (ported in
 * `suggest-core.ts`) already handle everything that's an exact rule; this
 * module only owns the network call itself. Keep this in sync by hand if
 * `src/suggest.ts`'s request shape ever changes.
 */

const MAX_COMMAND_CHARS = 240;
const REQUEST_TIMEOUT_MS = 8000;

let client: TypeSafeClient | undefined;

/** Lazily constructed so a missing key doesn't throw at module load. */
function getClient(): TypeSafeClient {
  client ??= new TypeSafeClient({ apiKey: env.TYPESAFE_API_KEY, timeout: REQUEST_TIMEOUT_MS, logLevel: "error" });
  return client;
}

export function hasTypeSafeCredentials(): boolean {
  return Boolean(env.TYPESAFE_API_KEY);
}

function displayCommand(command: string): string {
  const oneLine = command.replaceAll("\n", "\\n");
  return oneLine.length > MAX_COMMAND_CHARS ? oneLine.slice(0, MAX_COMMAND_CHARS - 1) + "…" : oneLine;
}

function buildRequest(typed: string, candidates: readonly Candidate[]) {
  const recent = candidates.map((c) => `${c.id}| ${displayCommand(c.command)}`).join("\n");

  const state = { typed_so_far: typed, recent_commands: recent };
  const criteria = Object.fromEntries(candidates.map((c) => [c.id, null])) as Record<string, null>;

  const questions = {
    completion: choice(
      {
        question:
          "The user is typing a command at a zsh prompt and has typed `typed_so_far` so far. Which command in `recent_commands` are they most likely in the middle of typing?",
        context:
          "`recent_commands` lists the user's most recently run shell commands, one per line as `<id>| <command>`, most recent first. The chosen command will be shown as an inline autosuggestion the user can accept with one keystroke, so pick the command they most plausibly want to run again given what they have typed.",
        how_to_rank: [
          "Best: the command starts with exactly the characters in `typed_so_far`, in the same order.",
          "Next: `typed_so_far` is an abbreviation of the command (the first letters of its words, e.g. `gst` for `git status`, or `dc` for `docker compose`), or it appears as a contiguous substring of the command.",
          "Next: the command uses the tool or performs the action that `typed_so_far` names, even if spelled differently.",
          "When several commands fit equally well, prefer the more recent one (the lower id number).",
        ],
      },
      criteria,
    ),
    has_completion: noul(
      "Does at least one command in `recent_commands` plausibly complete what the user has typed in `typed_so_far`?",
      {
        true: "Some listed command starts with `typed_so_far`, or `typed_so_far` is clearly an abbreviation or fragment of one of the listed commands.",
        false: "`typed_so_far` does not match the beginning, an abbreviation, or a fragment of any listed command; the user is typing something not in the list.",
      },
    ),
  };

  return { state, questions };
}

export interface JevRankResult {
  ranked: Suggestion[];
  hasCompletion: number;
}

/** Ranks `candidates` against `typed` via a real Jev request. Throws on timeout/network/API error -- the caller decides the fallback. */
export async function rankWithJev(typed: string, candidates: readonly Candidate[]): Promise<JevRankResult> {
  const { state, questions } = buildRequest(typed, candidates);
  const response = await getClient().systemOne({ state, questions });

  const probabilities = response.answers.completion.probabilities;
  const ranked = candidates
    .map((c) => ({
      command: c.command,
      score: probabilities[c.id] ?? 0,
      isPrefix: c.command.startsWith(typed),
    }))
    .sort((a, b) => b.score - a.score);

  return { ranked, hasCompletion: response.answers.has_completion.noul };
}
