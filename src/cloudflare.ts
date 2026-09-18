import type { Fetch } from "@typesafe-ai/sdk";

/**
 * Cloudflare Workers AI hosts the same Jev model TypeSafe does, but behind
 * its own account-scoped endpoint and envelope: one shared `ai/run` route
 * selects the model by name, the request body is wrapped in `input`, and
 * responses follow Cloudflare's standard `{ success, result }` API v4 shape
 * instead of TypeSafe's flat `{ model, answers, usage }`.
 *
 * Rather than reimplementing TypeSafeClient's retry/timeout/logging, this
 * swaps only its transport (the `fetch` it's constructed with) so it keeps
 * calling `/v1/systemone` with TypeSafe's own request/response shape, and
 * this function translates that one call to and from Cloudflare's shape.
 */
export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
}

interface CloudflareEnvelope {
  success: boolean;
  errors?: { code: number; message: string }[];
  result?: unknown;
}

export function cloudflareFetch({ accountId, apiToken }: CloudflareConfig): Fetch {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run`;

  return async (_input, init = {}) => {
    const body = init.body ? JSON.parse(String(init.body)) : {};
    const { state, questions } = body as { state: unknown; questions: unknown };

    // Connection failures propagate as-is; TypeSafeClient already classifies
    // and retries them like any other transport error.
    const response = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${apiToken}`, "content-type": "application/json" },
      body: JSON.stringify({ model: "typesafe/jev", input: { state, questions } }),
      ...(init.signal ? { signal: init.signal } : {}),
    });

    const text = await response.text();
    let payload: CloudflareEnvelope | undefined;
    try {
      payload = text ? (JSON.parse(text) as CloudflareEnvelope) : undefined;
    } catch {
      payload = undefined;
    }

    if (!response.ok || !payload?.success || payload.result === undefined) {
      const message = payload?.errors?.[0]?.message ?? response.statusText ?? "Cloudflare request failed";
      return new Response(JSON.stringify({ error: { message } }), {
        status: response.ok ? 502 : response.status,
        headers: { "content-type": "application/json" },
      });
    }

    // payload.result already matches TypeSafe's { model, answers, usage } shape.
    return new Response(JSON.stringify(payload.result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}
