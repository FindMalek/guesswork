import { CopyButton } from "./copy-button";
import { TerminalPlayground } from "./terminal-playground";

const INSTALL_COMMAND = "curl -fsSL https://guesswork.findmalek.com/install.sh | bash";

export function Hero() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pt-20 pb-16 text-center sm:pt-28">
      <h1 className="font-mono text-4xl font-semibold tracking-tight text-white sm:text-5xl">guesswork</h1>
      <p className="mt-5 max-w-2xl text-balance text-lg text-white/60 sm:text-xl">
        Fish-style autosuggestions for zsh &mdash; but the shell actually guesses right.
      </p>

      <div className="mt-8 flex w-full max-w-xl items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
        <code className="overflow-x-auto whitespace-nowrap text-left font-mono text-xs text-white/80 sm:text-sm">
          {INSTALL_COMMAND}
        </code>
        <CopyButton text={INSTALL_COMMAND} />
      </div>

      <div className="mt-14 flex w-full flex-col items-center gap-3">
        <TerminalPlayground />
        <p className="max-w-xl text-xs text-white/35">
          A live, in-browser demo &mdash; not a recording. It runs the same prefix/fuzzy mode-selection logic as the
          real plugin against a fabricated command history; see the note under the terminal for what&apos;s real vs.
          faked.
        </p>
      </div>
    </section>
  );
}
