interface Feature {
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    title: "Pick your provider",
    body: "TypeSafe direct or Cloudflare Workers AI both run the real Jev model. Anthropic (Claude Haiku 4.5) and Groq (GPT-OSS 20B, speed-optimized on LPU hardware) are fallbacks for when you'd rather not sign up for either.",
  },
  {
    title: "Prefix first, fuzzy when needed",
    body: "If anything in your recent history literally starts with what you typed, only those are ranked and a single match needs no request at all. Otherwise every candidate is ranked and gated on score and confidence.",
  },
  {
    title: "Works in your terminal, whichever it is",
    body: "The plugin hooks zsh's line editor directly and draws suggestions through POSTDISPLAY + region_highlight — the same mechanism zsh-autosuggestions uses. Verified hands-on in Ghostty and Terminal.app; no terminal-specific escape codes.",
  },
  {
    title: "Costs a fraction of a cent",
    body: "TypeSafe/Cloudflare price input at $42 per billion tokens ($0.000081 per request). Even a few hundred requests a day, every day, for a year lands around $10 total — not a line item you'll notice.",
  },
  {
    title: "One-command install, idempotent",
    body: "curl | bash launches an arrow-key wizard that asks for a provider, verifies credentials with one live request, and writes a single managed block into your .zshrc. Safe to re-run any time you want to switch providers.",
  },
  {
    title: "Exact rules in code, judgment in the model",
    body: "Prefix matching, dedup, and score thresholds are plain TypeScript — auditable, testable, deterministic. The model's only job is picking which candidate fits what you typed.",
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">What you actually get</h2>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="font-medium text-white">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/55">{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
