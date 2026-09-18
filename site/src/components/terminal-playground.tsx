"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { fakeSuggest } from "@/lib/fake-rank";
import { FAKE_HISTORY } from "@/lib/fake-history";

const PROMPT = "➜";
const MIN_CHARS = 2; // mirrors GUESSWORK_MIN_CHARS's default

interface RanLine {
  command: string;
}

/**
 * A hand-built terminal look-alike, not xterm.js and not a real shell.
 *
 * This exists because a real zsh (and therefore real `zle`/`POSTDISPLAY`,
 * the mechanism `zsh/guesswork.plugin.zsh` hooks) cannot run in a browser —
 * WebContainers only sandbox Node, not native binaries — and off-the-shelf
 * React terminal packages don't support inline ghost-text autosuggestion,
 * which is the entire point of this demo. So: a plain styled div, a hidden
 * input capturing real keystrokes, and `fakeSuggest()` (see
 * `../lib/fake-rank.ts`) standing in for the AI call. The mode selection
 * (prefix vs. fuzzy) and the `⇢` / plain-completion display format are the
 * real plugin's logic, ported as-is; only the ranking score is fabricated.
 */
export function TerminalPlayground() {
  const [buffer, setBuffer] = useState("");
  const [ranLines, setRanLines] = useState<RanLine[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestion = useMemo(() => {
    if (buffer.trim().length < MIN_CHARS) return undefined;
    return fakeSuggest(buffer, FAKE_HISTORY);
  }, [buffer]);

  function acceptSuggestion() {
    if (!suggestion) return;
    setBuffer(suggestion.command);
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
      if (suggestion) {
        e.preventDefault();
        acceptSuggestion();
      }
      return;
    }

    if (e.key === "ArrowRight" && atEnd && suggestion) {
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
    if (!suggestion) return null;
    const scoreLabel = ` [${suggestion.score.toFixed(2)}]`;
    if (suggestion.kind === "prefix") {
      return { text: suggestion.command.slice(buffer.length) + scoreLabel };
    }
    return { text: `  ⇢ ${suggestion.command}${scoreLabel}` };
  }, [suggestion, buffer]);

  return (
    <div
      className="w-full max-w-2xl rounded-xl border border-white/10 bg-[#0b0d12] shadow-2xl shadow-black/40"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
        <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
        <span className="ml-3 text-xs text-white/40">zsh &mdash; guesswork playground</span>
      </div>

      <div className="cursor-text px-4 py-4 font-mono text-[13px] leading-6 sm:text-sm">
        {ranLines.map((line, i) => (
          <div key={i} className="text-white/50">
            <span className="text-emerald-400">{PROMPT}</span> {line.command}
          </div>
        ))}

        <div className="relative flex items-start">
          <span className="mr-2 select-none text-emerald-400">{PROMPT}</span>
          <span className="whitespace-pre-wrap break-all text-white">
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
        Type a few characters (try <code className="text-white/50">git</code>, <code className="text-white/50">docker</code>{" "}
        or <code className="text-white/50">kub</code>) &middot; <kbd className="text-white/50">Tab</kbd> or{" "}
        <kbd className="text-white/50">&rarr;</kbd> accepts &middot; not a real shell &mdash; the ranking here is a
        deterministic stand-in, not a live AI call
      </div>
    </div>
  );
}
