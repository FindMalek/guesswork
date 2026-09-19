"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { fakeSuggest } from "@/lib/fake-rank";
import { FAKE_HISTORY } from "@/lib/fake-history";
import type { Suggestion } from "@/lib/suggest-core";

const PROMPT = "➜";
const MIN_CHARS = 2; // mirrors GUESSWORK_MIN_CHARS's default
const DEBOUNCE_MS = 150; // roughly the real plugin's ~110ms zle debounce

// Picked to exercise both modes against FAKE_HISTORY: "gst" and "kub" only
// resolve via fuzzy/abbreviation matching, "docker" and "git log" are literal
// prefixes with more than one candidate. Matches the hint text below.
const PRESETS = ["gst", "docker", "kub", "git log"];

interface RanLine {
  command: string;
}

interface SuggestResponse {
  ok: boolean;
  suggestion?: Suggestion | null;
  reason?: string;
}

/**
 * Asks the real /api/suggest route (a rate-limited server proxy to the real
 * Jev model, see src/lib/typesafe-client.ts) for a ranked suggestion.
 * Returns undefined on ANY non-success outcome -- rate limit, no server
 * credentials, provider timeout, or a network failure reaching the route at
 * all -- so the caller has one fallback path, not several.
 */
async function fetchJevSuggestion(typed: string, signal: AbortSignal): Promise<Suggestion | undefined> {
  try {
    const res = await fetch("/api/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typed }),
      signal,
    });
    const data = (await res.json()) as SuggestResponse;
    return data.ok ? (data.suggestion ?? undefined) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * A hand-built terminal look-alike, not xterm.js and not a real shell.
 *
 * This exists because a real zsh (and therefore real `zle`/`POSTDISPLAY`,
 * the mechanism `zsh/guesswork.plugin.zsh` hooks) cannot run in a browser --
 * WebContainers only sandbox Node, not native binaries -- and off-the-shelf
 * React terminal packages don't support inline ghost-text autosuggestion,
 * which is the entire point of this demo. So: a plain styled div, a hidden
 * input capturing real keystrokes, and a real ranked suggestion fetched from
 * `/api/suggest` (falling back to `fakeSuggest()`, see `../lib/fake-rank.ts`,
 * only when the real call is unavailable). The mode selection (prefix vs.
 * fuzzy) and the `⇢` / plain-completion display format are the real plugin's
 * logic, ported as-is in `suggest-core.ts`.
 */
interface SuggestionResult {
  /** The buffer this suggestion was computed for -- see `effectiveSuggestion`. */
  buffer: string;
  suggestion: Suggestion | undefined;
}

export function TerminalPlayground() {
  const [buffer, setBuffer] = useState("");
  const [ranLines, setRanLines] = useState<RanLine[]>([]);
  const [result, setResult] = useState<SuggestionResult | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Below MIN_CHARS, `effectiveSuggestion` below hides whatever's in
  // `result` at render time -- no setState here, so a short buffer never
  // needs to synchronously clear state the way an early-return would.
  useEffect(() => {
    if (buffer.trim().length < MIN_CHARS) return;

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      fetchJevSuggestion(buffer, controller.signal).then((real) => {
        if (controller.signal.aborted) return;
        if (real) {
          setResult({ buffer, suggestion: real });
          return;
        }
        const fake = fakeSuggest(buffer, FAKE_HISTORY);
        setResult({
          buffer,
          suggestion: fake && { command: fake.command, score: fake.score, isPrefix: fake.kind === "prefix" },
        });
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [buffer]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Requires the result to have been computed for the CURRENT buffer, not
  // just any recent one -- otherwise a suggestion fetched while the visitor
  // was still typing an earlier prefix could get displayed (and accepted)
  // against a buffer it was never ranked for, once the debounce window
  // closes on a buffer that still happens to clear MIN_CHARS.
  const effectiveSuggestion =
    buffer.trim().length >= MIN_CHARS && result?.buffer === buffer ? result.suggestion : undefined;

  function acceptSuggestion() {
    if (!effectiveSuggestion) return;
    setBuffer(effectiveSuggestion.command);
    // Move the real cursor to the end so a second accept keystroke doesn't
    // land mid-word, matching the real plugin only accepting at end-of-line.
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const atEnd = e.currentTarget.selectionStart === buffer.length && e.currentTarget.selectionEnd === buffer.length;

    if (e.key === "Tab") {
      // Tab always accepts, same as the real plugin's dedicated widget.
      if (effectiveSuggestion) {
        e.preventDefault();
        acceptSuggestion();
      }
      return;
    }

    if (e.key === "ArrowRight" && atEnd && effectiveSuggestion) {
      // Real plugin: forward-char / end-of-line accept only at end-of-line.
      e.preventDefault();
      acceptSuggestion();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const command = buffer.trim();
      if (command.length > 0) {
        setRanLines((lines) => [...lines.slice(-4), { command }]);
      }
      setBuffer("");
    }
  }

  const ghost = useMemo(() => {
    if (!effectiveSuggestion) return null;
    const scoreLabel = ` [${effectiveSuggestion.score.toFixed(2)}]`;
    if (effectiveSuggestion.isPrefix) {
      return { text: effectiveSuggestion.command.slice(buffer.length) + scoreLabel };
    }
    return { text: `  ⇢ ${effectiveSuggestion.command}${scoreLabel}` };
  }, [effectiveSuggestion, buffer]);

  // Named to avoid the "use..." hook-naming convention -- it's a plain
  // event handler, not a hook, but react-hooks/rules-of-hooks can't tell.
  function applyPreset(preset: string) {
    setBuffer(preset);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        <span className="mr-1">Try:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => applyPreset(preset)}
            className="rounded-full border border-border bg-card px-2.5 py-1 text-foreground/70 transition hover:border-primary hover:text-primary"
          >
            {preset}
          </button>
        ))}
      </div>
      <div
        className="rounded-xl border border-white/10 bg-terminal-bg shadow-2xl shadow-black/40"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-terminal-red" />
          <span className="h-3 w-3 rounded-full bg-terminal-amber" />
          <span className="h-3 w-3 rounded-full bg-terminal-green" />
          <span className="ml-3 text-xs text-white/40">zsh &mdash; guesswork playground</span>
        </div>

        <div className="cursor-text px-4 py-4 font-mono text-[13px] leading-6 sm:text-sm">
          {ranLines.map((line, i) => (
            <div key={i} className="text-terminal-muted">
              <span className="text-terminal-green">{PROMPT}</span> {line.command}
            </div>
          ))}

          <div className="relative flex items-start">
            <span className="mr-2 select-none text-terminal-green">{PROMPT}</span>
            <span className="whitespace-pre-wrap break-all text-terminal-text">
              {buffer}
              <span className="inline-block w-[1ch] animate-[gw-blink_1s_steps(1)_infinite] bg-white/80 align-middle">
                &nbsp;
              </span>
              {ghost && <span className="text-white/35">{ghost.text}</span>}
            </span>
          </div>

          <input
            ref={inputRef}
            value={buffer}
            onChange={(e) => setBuffer(e.target.value)}
            onKeyDown={handleKeyDown}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Try guesswork: type a command"
            className="sr-only"
          />
        </div>

        <div className="border-t border-white/10 px-4 py-2 text-[11px] text-white/30">
          Type a few characters (try <code className="text-white/50">git</code>,{" "}
          <code className="text-white/50">docker</code> or <code className="text-white/50">kub</code>) &middot;{" "}
          <kbd className="text-white/50">Tab</kbd> or <kbd className="text-white/50">&rarr;</kbd> accepts &middot;
          ranked by the real Jev model when available, a local stand-in otherwise -- never a real shell
        </div>
      </div>
    </div>
  );
}
