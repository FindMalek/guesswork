#!/usr/bin/env node
// Interactive setup wizard: pick a provider with the arrow keys, paste
// credentials, watch it verify them live, and it wires everything into your
// zsh rc file. Also drivable non-interactively (see --help) so an agent can
// run it in one shot without a TTY.
import { parseArgs } from "node:util";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { noul, TypeSafeClient } from "@typesafe-ai/sdk";
import * as p from "@clack/prompts";
import { anthropicFetch } from "./anthropic.ts";
import { cloudflareFetch } from "./cloudflare.ts";
import { groqFetch } from "./groq.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BLOCK_START = "# >>> guesswork >>>";
const BLOCK_END = "# <<< guesswork <<<";

const HELP = `guesswork setup: configure a provider and wire up your zsh rc file

Usage: node src/setup.ts [options]

Runs as an interactive, arrow-key wizard when there's a TTY. Any option given
below pre-fills that step (so e.g. --provider alone still prompts for
credentials interactively). Without a TTY, every needed option must be
passed — there's nothing to prompt into.

  --provider <typesafe|cloudflare|anthropic|groq>
  --api-key <key>                  TypeSafe: your TYPESAFE_API_KEY; Anthropic: your ANTHROPIC_API_KEY; Groq: your GROQ_API_KEY
  --account-id <id>                Cloudflare: your account ID
  --api-token <token>              Cloudflare: an API token with Workers AI access
  --rc <path>                      Shell rc file to edit (default: $ZDOTDIR/.zshrc or ~/.zshrc)
  --skip-test                      Don't make a live request to verify credentials
  --yes                            Don't ask for confirmation
  -h, --help`;

interface Args {
  provider: string | undefined;
  apiKey: string | undefined;
  accountId: string | undefined;
  apiToken: string | undefined;
  rc: string | undefined;
  skipTest: boolean;
  yes: boolean;
}

function parseCliArgs(): Args {
  const { values } = parseArgs({
    options: {
      provider: { type: "string" },
      "api-key": { type: "string" },
      "account-id": { type: "string" },
      "api-token": { type: "string" },
      rc: { type: "string" },
      "skip-test": { type: "boolean", default: false },
      yes: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }
  return {
    provider: values.provider,
    apiKey: values["api-key"],
    accountId: values["account-id"],
    apiToken: values["api-token"],
    rc: values.rc,
    skipTest: values["skip-test"],
    yes: values.yes,
  };
}

// ------------------------------------------------------------- providers --

type Provider = "typesafe" | "cloudflare" | "anthropic" | "groq";

interface Credentials {
  provider: Provider;
  apiKey: string | undefined; // typesafe, anthropic, groq
  accountId: string | undefined; // cloudflare
  apiToken: string | undefined; // cloudflare
}

function exitOnCancel<T>(value: T | typeof p.CANCEL_SYMBOL): T {
  if (p.isCancel(value)) {
    p.cancel("Setup cancelled — nothing was written.");
    process.exit(0);
  }
  return value as T;
}

async function pickProvider(args: Args, tty: boolean): Promise<Provider> {
  if (
    args.provider === "typesafe" ||
    args.provider === "cloudflare" ||
    args.provider === "anthropic" ||
    args.provider === "groq"
  ) {
    return args.provider;
  }
  if (args.provider) {
    console.error(`unknown --provider "${args.provider}"; expected "typesafe", "cloudflare", "anthropic", or "groq"`);
    process.exit(2);
  }
  if (!tty) {
    console.error("no TTY and no --provider given; pass --provider typesafe|cloudflare|anthropic|groq (see --help)");
    process.exit(2);
  }
  return exitOnCancel(
    await p.select({
      message: "Which provider should guesswork use?",
      options: [
        { value: "typesafe", label: "TypeSafe", hint: "direct — typesafe.ai" },
        { value: "cloudflare", label: "Cloudflare Workers AI", hint: "same model, billed through Cloudflare" },
        {
          value: "anthropic",
          label: "Anthropic (Claude)",
          hint: "fallback: a real Claude model standing in for Jev, not Jev itself",
        },
        {
          value: "groq",
          label: "Groq",
          hint: "fallback: fastest — LPU hardware — a real chat model standing in for Jev, not Jev itself",
        },
      ],
    }),
  );
}

async function collectCredentials(provider: Provider, args: Args, tty: boolean): Promise<Credentials> {
  if (provider === "typesafe") {
    let apiKey = args.apiKey;
    if (!apiKey) {
      if (!tty) {
        console.error("no TTY and no --api-key given (see --help)");
        process.exit(2);
      }
      apiKey = exitOnCancel(
        await p.password({
          message: "Paste your TYPESAFE_API_KEY (get one at https://typesafe.ai)",
          validate: (v) => (v ? undefined : "an API key is required"),
        }),
      );
    }
    return { provider, apiKey, accountId: undefined, apiToken: undefined };
  }

  if (provider === "anthropic") {
    let apiKey = args.apiKey;
    if (!apiKey) {
      if (!tty) {
        console.error("no TTY and no --api-key given (see --help)");
        process.exit(2);
      }
      p.note(
        "This runs a real Claude model in place of Jev, not Jev itself — a\n" +
          "fallback for when you'd rather not sign up for TypeSafe or Cloudflare.\n" +
          "Get a key at https://console.anthropic.com/settings/keys",
        "Anthropic",
      );
      apiKey = exitOnCancel(
        await p.password({
          message: "Paste your ANTHROPIC_API_KEY",
          validate: (v) => (v ? undefined : "an API key is required"),
        }),
      );
    }
    return { provider, apiKey, accountId: undefined, apiToken: undefined };
  }

  if (provider === "groq") {
    let apiKey = args.apiKey;
    if (!apiKey) {
      if (!tty) {
        console.error("no TTY and no --api-key given (see --help)");
        process.exit(2);
      }
      p.note(
        "This runs a real chat model in place of Jev, not Jev itself — a\n" +
          "fallback for when you'd rather not sign up for TypeSafe or Cloudflare,\n" +
          "optimized for speed (Groq's custom LPU hardware).\n" +
          "Get a key at https://console.groq.com/keys",
        "Groq",
      );
      apiKey = exitOnCancel(
        await p.password({
          message: "Paste your GROQ_API_KEY",
          validate: (v) => (v ? undefined : "an API key is required"),
        }),
      );
    }
    return { provider, apiKey, accountId: undefined, apiToken: undefined };
  }

  let accountId = args.accountId;
  let apiToken = args.apiToken;
  if (!accountId || !apiToken) {
    if (!tty) {
      console.error("no TTY and no --account-id/--api-token given (see --help)");
      process.exit(2);
    }
    p.note(
      "Account ID: open https://dash.cloudflare.com — it's the 32-character\n" +
        "code right after \"dash.cloudflare.com/\" in the URL bar once you've\n" +
        "picked an account (also shown under Workers & Pages → Overview, top\n" +
        "right, with a copy-to-clipboard button next to it).\n\n" +
        "API Token: https://dash.cloudflare.com/profile/api-tokens → Create\n" +
        "Token → Custom Token → give it \"Workers AI: Read\" (or Edit) at the\n" +
        "Account level → Continue → Create Token. Copy it now, it's shown once.",
      "Cloudflare",
    );
    accountId ??= exitOnCancel(
      await p.text({ message: "Cloudflare Account ID", validate: (v) => (v ? undefined : "required") }),
    );
    apiToken ??= exitOnCancel(
      await p.password({ message: "Cloudflare API Token", validate: (v) => (v ? undefined : "required") }),
    );
  }
  return { provider, apiKey: undefined, accountId, apiToken };
}

function buildClient(creds: Credentials): TypeSafeClient {
  if (creds.provider === "typesafe") {
    // Validated non-empty in collectCredentials.
    return new TypeSafeClient({ apiKey: creds.apiKey!, timeout: 8000, logLevel: "error" });
  }
  if (creds.provider === "anthropic") {
    const apiKey = creds.apiKey!;
    return new TypeSafeClient({
      apiKey,
      baseURL: "https://api.anthropic.com",
      timeout: 8000,
      logLevel: "error",
      fetch: anthropicFetch({ apiKey }),
    });
  }
  if (creds.provider === "groq") {
    const apiKey = creds.apiKey!;
    return new TypeSafeClient({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1",
      timeout: 8000,
      logLevel: "error",
      fetch: groqFetch({ apiKey }),
    });
  }
  const { accountId, apiToken } = creds as { accountId: string; apiToken: string };
  return new TypeSafeClient({
    apiKey: apiToken,
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai`,
    timeout: 8000,
    logLevel: "error",
    fetch: cloudflareFetch({ accountId, apiToken }),
  });
}

async function testCredentials(creds: Credentials): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const client = buildClient(creds);
    await client.systemOne({
      state: "ping",
      questions: { reachable: noul("Is this state non-empty?", { true: "it has text", false: "it is empty" }) },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------- .zshrc --

function shellWarning(): string | undefined {
  const shell = process.env.SHELL ?? "";
  if (shell.endsWith("/zsh")) return undefined;
  return (
    `Your default shell looks like ${shell || "(unknown)"}, not zsh. guesswork hooks zsh's line ` +
    `editor (zle) directly, so it only works when actually running zsh — the config below is still ` +
    `written to a zsh rc file, but you'll need to run/switch to zsh to see suggestions.`
  );
}

function rcPath(args: Args): string {
  if (args.rc) return args.rc;
  const zdotdir = process.env.ZDOTDIR ?? homedir();
  return join(zdotdir, ".zshrc");
}

function writeBlock(path: string, lines: string[]): void {
  const block = [BLOCK_START, ...lines, BLOCK_END].join("\n");
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";

  if (existing.includes(BLOCK_START)) {
    const pattern = new RegExp(`${escapeRegExp(BLOCK_START)}[\\s\\S]*?${escapeRegExp(BLOCK_END)}`);
    writeFileSync(path, existing.replace(pattern, block));
  } else {
    const separator = existing.length > 0 && !existing.endsWith("\n") ? "\n\n" : existing.length > 0 ? "\n" : "";
    writeFileSync(path, existing + separator + block + "\n");
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ----------------------------------------------------------------- main ---

async function main(): Promise<void> {
  const args = parseCliArgs();
  const tty = process.stdin.isTTY === true;

  if (tty) p.intro("guesswork setup");
  else console.log("guesswork setup (non-interactive)");

  const provider = await pickProvider(args, tty);
  const creds = await collectCredentials(provider, args, tty);

  if (!args.skipTest) {
    const s = tty ? p.spinner() : undefined;
    s ? s.start(`Testing your ${provider} credentials`) : process.stdout.write("Testing credentials... ");
    const result = await testCredentials(creds);

    if (result.ok) {
      s ? s.stop("Credentials verified") : console.log("ok");
    } else {
      s ? s.error("Credentials check failed") : console.log("failed");
      if (tty) {
        p.note(result.message, "Error");
        const proceed = exitOnCancel(await p.confirm({ message: "Save the config anyway?", initialValue: false }));
        if (!proceed) {
          p.cancel("Nothing was written.");
          process.exit(1);
        }
      } else {
        console.error(`  ${result.message}`);
        process.exit(1);
      }
    }
  }

  const warning = shellWarning();
  if (warning) {
    if (tty) p.log.warn(warning);
    else console.warn(`warning: ${warning}`);
  }

  const path = rcPath(args);
  const exportLines =
    creds.provider === "typesafe"
      ? [`export TYPESAFE_API_KEY=${creds.apiKey}`]
      : creds.provider === "anthropic"
        ? [`export ANTHROPIC_API_KEY=${creds.apiKey}`]
        : creds.provider === "groq"
          ? [`export GROQ_API_KEY=${creds.apiKey}`]
          : [`export CLOUDFLARE_ACCOUNT_ID=${creds.accountId}`, `export CLOUDFLARE_API_TOKEN=${creds.apiToken}`];
  writeBlock(path, [...exportLines, `source "${join(REPO_ROOT, "zsh/guesswork.plugin.zsh")}"`]);

  if (tty) {
    p.outro(`Wrote config to ${path} — run 'exec zsh' (or open a new terminal) to start using it.`);
  } else {
    console.log(`Wrote config to ${path}`);
    console.log("Run 'exec zsh' (or open a new terminal) to start using it.");
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
