#!/usr/bin/env node
import { parseArgs } from "node:util";
import { homedir } from "node:os";
import { join } from "node:path";
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { readHistoryFile, recentCommands } from "./history.ts";
import { pickSuggestion, suggest, type Gates, type Suggestion } from "./suggest.ts";

const HELP = `guesswork-suggest: rank recent zsh history entries as completions for typed text

Usage: guesswork-suggest --buffer <text> [options]

Options:
  -b, --buffer <text>     What the user has typed so far (required)
      --history <path>    History file (default: $HISTFILE or ~/.zsh_history)
      --limit <n>         Recent distinct commands to consider (default: 100)
      --min-chars <n>     Do nothing when the buffer is shorter (default: 2)
      --threshold <p>     Fuzzy mode: min has_completion probability to suggest (default: 0.5)
      --min-score <p>     Fuzzy mode: min score of the top candidate to suggest (default: 0.3)
      --strong-score <p>  Fuzzy mode: a top score this high overrides --threshold (default: 0.9)
      --jev-only          Never narrow to literal prefix matches; Jev ranks all entries
      --model <name>      TypeSafe model (default: SDK default, jev-latest)
      --timeout <ms>      Request timeout per attempt (default: 8000)
      --json              Print the full ranked result as JSON
      --list [n]          Print the top n candidates with scores (default: 10)
  -h, --help

When some history entries start with the typed text ("prefix mode"), only those
are sent to Jev for ranking and the top one is always suggested. Otherwise
("fuzzy mode") every recent entry is ranked and a suggestion is only made when
the top score is at least --min-score and either has_completion is at least
--threshold or the top score is at least --strong-score.

Default output (consumed by the zsh plugin) is empty when there is nothing to
suggest, otherwise a header line "<score> <has_completion> <prefix|replace>"
followed by the suggested command, which may span several lines.

Requires TYPESAFE_API_KEY in the environment.`;

function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      buffer: { type: "string", short: "b" },
      history: { type: "string" },
      limit: { type: "string", default: "100" },
      "min-chars": { type: "string", default: "2" },
      threshold: { type: "string", default: "0.5" },
      "min-score": { type: "string", default: "0.3" },
      "strong-score": { type: "string", default: "0.9" },
      "jev-only": { type: "boolean", default: false },
      model: { type: "string" },
      timeout: { type: "string", default: "8000" },
      json: { type: "boolean", default: false },
      list: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    process.stdout.write(HELP + "\n");
    return Promise.resolve(0);
  }
  if (values.buffer === undefined) {
    process.stderr.write("guesswork-suggest: --buffer is required (see --help)\n");
    return Promise.resolve(2);
  }
  if (!process.env.TYPESAFE_API_KEY) {
    process.stderr.write("guesswork-suggest: TYPESAFE_API_KEY is not set\n");
    return Promise.resolve(2);
  }

  const typed = values.buffer;
  const minChars = Number(values["min-chars"]);
  if (typed.trim().length < minChars) return Promise.resolve(0);

  const historyPath = values.history ?? process.env.HISTFILE ?? join(homedir(), ".zsh_history");
  const commands = recentCommands(readHistoryFile(historyPath), Number(values.limit));

  return run({
    typed,
    commands,
    gates: {
      threshold: Number(values.threshold),
      minScore: Number(values["min-score"]),
      strongScore: Number(values["strong-score"]),
    },
    prefixFilter: !values["jev-only"],
    model: values.model,
    timeoutMs: Number(values.timeout),
    json: values.json,
    list: values.list === undefined ? undefined : Number(values.list || "10"),
  });
}

interface RunOptions {
  typed: string;
  commands: string[];
  gates: Gates;
  prefixFilter: boolean;
  model: string | undefined;
  timeoutMs: number;
  json: boolean;
  list: number | undefined;
}

async function run(o: RunOptions): Promise<number> {
  const client = new TypeSafeClient({ timeout: o.timeoutMs, logLevel: "error" });
  const started = performance.now();
  const result = await suggest(client, o.typed, o.commands, {
    prefixFilter: o.prefixFilter,
    ...(o.model ? { model: o.model } : {}),
  });
  const elapsedMs = Math.round(performance.now() - started);

  const top = pickSuggestion(result, o.gates);

  if (o.json) {
    process.stdout.write(
      JSON.stringify(
        {
          typed: o.typed,
          mode: result.mode,
          model: result.model,
          elapsedMs,
          usage: result.usage,
          hasCompletion: result.hasCompletion,
          suggestion: top ?? null,
          ranked: result.ranked,
        },
        null,
        2,
      ) + "\n",
    );
    return 0;
  }

  if (o.list !== undefined) {
    process.stdout.write(
      `typed: ${JSON.stringify(o.typed)}  mode: ${result.mode}  candidates: ${result.ranked.length}  ` +
        `has_completion: ${result.hasCompletion.toFixed(2)}  ${result.model || "(no request)"}  ${elapsedMs}ms  ` +
        `${result.usage.input_tokens}in/${result.usage.output_tokens}out\n`,
    );
    for (const s of result.ranked.slice(0, o.list)) {
      process.stdout.write(`  ${s.score.toFixed(3)}  ${s.isPrefix ? "prefix " : "replace"}  ${oneLine(s.command)}\n`);
    }
    process.stdout.write(top ? `suggest: ${oneLine(top.command)}\n` : "suggest: (nothing)\n");
    return 0;
  }

  if (top) process.stdout.write(formatForShell(top, result.hasCompletion));
  return 0;
}

export function formatForShell(s: Suggestion, hasCompletion: number): string {
  return `${s.score.toFixed(3)} ${hasCompletion.toFixed(3)} ${s.isPrefix ? "prefix" : "replace"}\n${s.command}`;
}

function oneLine(command: string): string {
  const flat = command.replaceAll("\n", "⏎ ");
  return flat.length > 100 ? flat.slice(0, 99) + "…" : flat;
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    process.stderr.write(`guesswork-suggest: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  },
);
