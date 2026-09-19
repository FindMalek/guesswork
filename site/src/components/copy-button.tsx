"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API can be unavailable (insecure context, permissions);
      // fail silently rather than throw in front of a visitor.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      aria-label="Copy install command"
      className="ml-2 shrink-0 text-xs"
    >
      {copied ? (
        <>
          <Check className="size-3.5" /> Copied
        </>
      ) : (
        <>
          <Copy className="size-3.5" /> Copy
        </>
      )}
    </Button>
  );
}
