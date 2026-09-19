import { ThemeToggle } from "@/components/theme-toggle";

// lucide-react dropped brand/logo icons (Github, Twitter, etc.) from this
// version's core set -- inlined here rather than pulling in a whole extra
// icon package for one mark.
function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.6.113.793-.26.793-.577 0-.285-.01-1.04-.016-2.04-3.338.725-4.043-1.61-4.043-1.61-.546-1.386-1.333-1.755-1.333-1.755-1.089-.745.084-.729.084-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.42-1.305.762-1.605-2.665-.303-5.467-1.332-5.467-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.51 11.51 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.655 1.653.243 2.874.12 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.807 5.624-5.48 5.92.432.372.816 1.103.816 2.222 0 1.606-.014 2.898-.014 3.293 0 .32.192.694.8.576C20.565 21.796 24 17.298 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  );
}

export function SiteFooter({ stars }: { stars: number | null }) {
  return (
    <footer className="w-full border-t border-black/[0.04] px-6 py-3.5 dark:border-white/[0.05]">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-2 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2 font-mono text-[12px] text-muted-foreground">
          <span className="font-medium text-foreground">guesswork</span>
          <span>·</span>
          <span>MIT License</span>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="https://github.com/findmalek/guesswork"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 border border-black/5 bg-card px-2.5 py-1 font-mono text-[12px] text-foreground transition-all hover:border-black/20 dark:border-white/5 dark:hover:border-white/20"
          >
            <GithubMark className="size-3.5" />
            <span className="hidden text-muted-foreground sm:inline">findmalek/guesswork</span>
            {stars !== null && <span className="ml-0.5 text-[11px] font-medium text-primary">★ {stars}</span>}
          </a>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
