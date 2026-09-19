type TokenKind = "command" | "flag" | "pipe" | "arg" | "space";

interface Token {
  text: string;
  kind: TokenKind;
}

/**
 * Minimal shell tokenizer -- enough for a one-line install command (a
 * command name, flags, a URL argument, a pipe, another command), not a
 * general bash parser. The first word, and the first word after each `|`,
 * is treated as a command name; anything starting with `-` is a flag;
 * everything else is a plain argument.
 */
function tokenize(command: string): Token[] {
  const parts = command.split(/(\s+)/).filter((part) => part !== "");
  const tokens: Token[] = [];
  let expectingCommand = true;

  for (const part of parts) {
    if (/^\s+$/.test(part)) {
      tokens.push({ text: part, kind: "space" });
      continue;
    }
    if (part === "|") {
      tokens.push({ text: part, kind: "pipe" });
      expectingCommand = true;
      continue;
    }
    if (expectingCommand) {
      tokens.push({ text: part, kind: "command" });
      expectingCommand = false;
      continue;
    }
    tokens.push({ text: part, kind: part.startsWith("-") ? "flag" : "arg" });
  }

  return tokens;
}

const CLASS_FOR: Record<TokenKind, string> = {
  command: "text-primary font-medium",
  flag: "text-muted-foreground",
  pipe: "text-muted-foreground font-medium",
  arg: "text-foreground",
  space: "",
};

export function InstallCommand({ command, className }: { command: string; className?: string }) {
  return (
    <code className={className}>
      {tokenize(command).map((token, i) => (
        <span key={i} className={CLASS_FOR[token.kind]}>
          {token.text}
        </span>
      ))}
    </code>
  );
}
