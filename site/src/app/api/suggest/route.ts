import { NextResponse } from "next/server";
import { z } from "zod";
import { FAKE_HISTORY } from "@/lib/fake-history";
import { suggestRateLimiters } from "@/lib/rate-limiter";
import { pickSuggestion, selectCandidates, type Suggestion } from "@/lib/suggest-core";
import { hasTypeSafeCredentials, rankWithJev } from "@/lib/typesafe-client";

/**
 * Real Jev ranking for the landing-page terminal playground, kept behind a
 * server route so `TYPESAFE_API_KEY` never reaches the browser. Always
 * ranks against the fixed, fabricated `FAKE_HISTORY` -- never anything from
 * the request -- since this is a public demo, not a place to accept
 * arbitrary user data.
 *
 * Every fallback path (rate limit, no credentials, provider error) returns
 * `ok: false` with a `reason` rather than a non-2xx status, so the client
 * has one shape to branch on before falling back to the local deterministic
 * demo (`fake-rank.ts`) instead of needing separate HTTP-error handling.
 */

const RequestBody = z.object({
  typed: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  const identifier = suggestRateLimiters.perIp.getIdentifier(request.headers);
  if (!suggestRateLimiters.perIp.check(identifier).success || !suggestRateLimiters.global.check("all").success) {
    return NextResponse.json({ ok: false, reason: "rate_limited" as const });
  }

  const parsed = RequestBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid_request" as const }, { status: 400 });
  }

  const { typed } = parsed.data;
  const { mode, candidates } = selectCandidates(typed, FAKE_HISTORY);

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, suggestion: null, mode });
  }

  // A single literal prefix match needs no model judgment -- mirrors the
  // short-circuit in the real `suggest()`, saves a request, and (checked
  // before credentials, unlike everything below) works even without a
  // configured key, exactly like the real plugin never touching its client
  // for this case either.
  if (mode === "prefix" && candidates.length === 1) {
    const only = candidates[0]!;
    const suggestion: Suggestion = { command: only.command, score: 1, isPrefix: true };
    return NextResponse.json({ ok: true, suggestion, mode });
  }

  if (!hasTypeSafeCredentials()) {
    return NextResponse.json({ ok: false, reason: "unconfigured" as const });
  }

  try {
    const { ranked, hasCompletion } = await rankWithJev(typed, candidates);
    const suggestion = pickSuggestion({ mode, hasCompletion, ranked }) ?? null;
    return NextResponse.json({ ok: true, suggestion, mode });
  } catch {
    // Provider timeout, network error, or API error -- degrade rather than
    // surface a broken demo.
    return NextResponse.json({ ok: false, reason: "provider_error" as const });
  }
}
