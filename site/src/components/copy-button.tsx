"use client";

import { useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type CopyState = "idle" | "copied" | "failed";

export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<CopyState>("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      // Clipboard API can be unavailable (insecure context, permissions) --
      // tell the visitor rather than failing silently, since there's no
      // other way for them to know the click did nothing.
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1800);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      aria-label={state === "failed" ? "Copy failed -- select the command manually" : "Copy install command"}
      className="ml-2 shrink-0 text-xs"
    >
      {state === "copied" ? (
        <>
          <Check className="size-3.5" /> Copied
        </>
      ) : state === "failed" ? (
        <>
          <TriangleAlert className="size-3.5" /> Copy failed
        </>
      ) : (
        <>
          <Copy className="size-3.5" /> Copy
        </>
      )}
    </Button>
  );
}
