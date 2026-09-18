#!/usr/bin/env node
// Interactive setup wizard: pick a provider, paste credentials, verify they
// work, and wire everything into the right shell rc file. Also drivable
// non-interactively (see --help) so an agent can run it in one shot.
import { parseArgs } from "node:util";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { noul, TypeSafeClient } from "@typesafe-ai/sdk";
import { cloudflareFetch } from "./cloudflare.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BLOCK_START = "# >>> guesswork >>>";
const BLOCK_END = "# <<< guesswork <<<";

const HELP = `guesswork setup: configure a provider and wire up your zsh rc file

Usage: node src/setup.ts [options]

Runs interactively when there's a TTY and no --provider is given. For
non-interactive / agent-driven runs, pass everything up front:

  --provider <typesafe|cloudflare>
  --api-key <key>                  TypeSafe: your TYPESAFE_API_KEY
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

// ------------------------------------------------------------------- io ---

const rl = createInterface({ input: process.stdin, output: process.stdout });

async function ask(question: string): Promise<string> {
  return (await rl.question(question)).trim();
}

/** Reads a line without echoing it back, for pasting secrets. Falls back to a plain prompt when stdin isn't a TTY (e.g. piped input in CI). */
async function askSecret(question: string): Promise<string> {
  if (!process.stdin.isTTY) return ask(question);

  process.stdout.write(question);
  return new Promise((resolve) => {
    let value = "";
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\n" || char === "\r") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(value.trim());
          return;
        }
        if (char === "") {
          process.stdout.write("\n");
          process.exit(130);
        }
        if (char === "" || char === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        value += char;
        process.stdout.write("*");
      }
    };
    stdin.on("data", onData);
  });
}

// ------------------------------------------------------------- providers --

type Provider = "typesafe" | "cloudflare";

interface Credentials {
  provider: Provider;
  apiKey?: string; // typesafe
  accountId?: string; // cloudflare
  apiToken?: string; // cloudflare
}

async function pickProvider(args: Args): Promise<Provider> {
  if (args.provider === "typesafe" || args.provider === "cloudflare") return args.provider;
  if (args.provider) {
    console.error(`unknown --provider "${args.provider}"; expected "typesafe" or "cloudflare"`);
    process.exit(2);
  }
  if (!process.stdin.isTTY) {
    console.error("no TTY and no --provider given; pass --provider typesafe|cloudflare (see --help)");
    process.exit(2);
  }
  console.log("Which provider should guesswork use?\n");
  console.log("  1) TypeSafe        — direct, get a key at https://typesafe.ai");
  console.log("  2) Cloudflare      — Workers AI hosts the same model, billed through your Cloudflare account\n");
  while (true) {
    const answer = await ask("> ");
    if (answer === "1") return "typesafe";
    if (answer === "2") return "cloudflare";
    console.log('Please enter "1" or "2".');
  }
}

async function collectCredentials(provider: Provider, args: Args): Promise<Credentials> {
  if (provider === "typesafe") {
    const apiKey = args.apiKey ?? (await askSecret("Paste your TYPESAFE_API_KEY: "));
    if (!apiKey) {
      console.error("no API key given");
      process.exit(2);
    }
    return { provider, apiKey };
  }

  console.log("\nFind your Account ID in the Cloudflare dashboard sidebar.");
  console.log("Create a token with Workers AI access at https://dash.cloudflare.com/profile/api-tokens\n");
  const accountId = args.accountId ?? (await ask("Cloudflare Account ID: "));
  const apiToken = args.apiToken ?? (await askSecret("Cloudflare API Token: "));
  if (!accountId || !apiToken) {
    console.error("account ID and API token are both required");
    process.exit(2);
  }
  return { provider, accountId, apiToken };
}

function buildClient(creds: Credentials): TypeSafeClient {
  if (creds.provider === "typesafe") {
    // Validated non-empty in collectCredentials.
    return new TypeSafeClient({ apiKey: creds.apiKey!, timeout: 8000, logLevel: "error" });
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

  console.log("guesswork setup\n");

  const provider = await pickProvider(args);
  const creds = await collectCredentials(provider, args);

  if (!args.skipTest) {
    process.stdout.write(`\nTesting your ${provider} credentials... `);
    const result = await testCredentials(creds);
    if (result.ok) {
      console.log("ok");
    } else {
      console.log("failed");
      console.error(`  ${result.message}`);
      if (process.stdin.isTTY && !args.yes) {
        const retry = await ask("\nSave the config anyway? [y/N] ");
        if (retry.toLowerCase() !== "y") {
          console.log("aborted; nothing was written");
          process.exit(1);
        }
      } else {
        process.exit(1);
      }
    }
  }

  const warning = shellWarning();
  if (warning) console.log(`\n⚠ ${warning}`);

  const path = rcPath(args);
  const exportLines =
    creds.provider === "typesafe"
      ? [`export TYPESAFE_API_KEY=${creds.apiKey}`]
      : [`export CLOUDFLARE_ACCOUNT_ID=${creds.accountId}`, `export CLOUDFLARE_API_TOKEN=${creds.apiToken}`];
  writeBlock(path, [...exportLines, `source "${join(REPO_ROOT, "zsh/guesswork.plugin.zsh")}"`]);

  console.log(`\nWrote config to ${path}`);
  console.log("Run 'exec zsh' (or open a new terminal) to start using it.");
  rl.close();
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
