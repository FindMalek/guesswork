import { CopyButton } from "./copy-button";
import { InstallCommand } from "./install-command";
import { TerminalPlayground } from "./terminal-playground";

const INSTALL_COMMAND = "curl -fsSL https://guesswork.findmalek.com/install.sh | bash";

export function Hero({ version }: { version: string }) {
  return (
    <section className="mx-auto flex max-w-4xl flex-col items-center px-6 py-6 text-center sm:py-8">
      <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-card/80 px-2.5 py-0.5 font-mono text-[11px] tracking-wide text-muted-foreground uppercase dark:border-white/5">
        <span className="size-1.5 rounded-full bg-primary" />
        zsh plugin · v{version}
      </span>
      <h1 className="font-mono text-4xl font-bold tracking-tight text-foreground lowercase sm:text-[54px]">
        guesswork
      </h1>
      <p className="mt-3.5 max-w-lg text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
        Fish-style autosuggestions for <span className="font-mono font-medium text-foreground">zsh</span> &mdash; but
        the shell actually guesses right.
      </p>

      <div className="mt-6 w-full max-w-xl">
        <div className="flex items-center justify-between rounded-lg border border-black/[0.06] bg-card px-3.5 py-2 shadow-sm transition-all hover:border-black/15 dark:border-white/[0.08] dark:hover:border-white/15">
          <InstallCommand
            command={INSTALL_COMMAND}
            className="overflow-x-auto whitespace-nowrap text-left font-mono text-[13px]"
          />
          <CopyButton text={INSTALL_COMMAND} />
        </div>
      </div>

      <div className="mt-6 flex w-full max-w-3xl flex-col items-center gap-2.5">
        <TerminalPlayground />
        <p className="max-w-xl font-mono text-xs text-muted-foreground">
          A live, in-browser demo, ranked by the real Jev model via a rate-limited server proxy &mdash; not a
          recording, and not hardcoded. See the note under the terminal for what falls back to a local stand-in.
        </p>
      </div>
    </section>
  );
}
