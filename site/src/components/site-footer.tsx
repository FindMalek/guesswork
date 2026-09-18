const LINKS = [
  { label: "GitHub", href: "https://github.com/findmalek/guesswork" },
  { label: "Docs (README)", href: "https://github.com/findmalek/guesswork#readme" },
  { label: "License (MIT)", href: "https://github.com/findmalek/guesswork/blob/main/LICENSE" },
  { label: "Issues", href: "https://github.com/findmalek/guesswork/issues" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-10 text-sm text-white/50 sm:flex-row sm:justify-between">
        <span>guesswork &mdash; MIT licensed</span>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
