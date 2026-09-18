import { test } from "node:test";
import assert from "node:assert/strict";
import { cloudflareFetch } from "./cloudflare.ts";

/** Stubs the global fetch for the duration of `fn`, recording every call. */
async function withStubbedFetch<T>(
  handler: (url: string, init: RequestInit) => Response | Promise<Response>,
  fn: () => Promise<T>,
): Promise<{ result: T; calls: { url: string; init: RequestInit }[] }> {
  const calls: { url: string; init: RequestInit }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const record = { url: String(url), init: init ?? {} };
    calls.push(record);
    return handler(record.url, record.init);
  }) as typeof fetch;
  try {
    const result = await fn();
    return { result, calls };
  } finally {
    globalThis.fetch = original;
  }
}

const typeSafeRequestInit = (): RequestInit => ({
  method: "POST",
  body: JSON.stringify({
    state: "typed_so_far",
    questions: { completion: { type: "choice", criteria: { C00: null } } },
    model: "jev-latest",
  }),
});

test("cloudflareFetch posts to the account-scoped run endpoint with the wrapped body", async () => {
  const fetchImpl = cloudflareFetch({ accountId: "acct-1", apiToken: "cf-token" });

  const { calls } = await withStubbedFetch(
    () =>
      new Response(JSON.stringify({ success: true, result: { model: "jev-1.13.0", answers: {}, usage: {} } }), {
        status: 200,
      }),
    () => fetchImpl("https://ignored.example/v1/systemone", typeSafeRequestInit()),
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.url, "https://api.cloudflare.com/client/v4/accounts/acct-1/ai/run");
  assert.equal((calls[0]!.init.headers as Record<string, string>).authorization, "Bearer cf-token");

  const sentBody = JSON.parse(String(calls[0]!.init.body));
  assert.equal(sentBody.model, "typesafe/jev");
  assert.equal(sentBody.input.state, "typed_so_far");
  assert.deepEqual(sentBody.input.questions, {
    completion: { type: "choice", criteria: { C00: null } },
  });
});

test("cloudflareFetch unwraps Cloudflare's { success, result } envelope into TypeSafe's flat shape", async () => {
  const fetchImpl = cloudflareFetch({ accountId: "acct-1", apiToken: "cf-token" });
  const inner = {
    model: "jev-1.13.0",
    answers: { completion: { type: "choice", choice: "C00", confidence: 1, probabilities: { C00: 1 } } },
    usage: { input_tokens: 10, output_tokens: 2 },
  };

  const { result: response } = await withStubbedFetch(
    () => new Response(JSON.stringify({ success: true, result: inner }), { status: 200 }),
    () => fetchImpl("https://ignored.example/v1/systemone", typeSafeRequestInit()),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), inner);
});

test("cloudflareFetch turns Cloudflare's error envelope into TypeSafe's { error: { message } } shape", async () => {
  const fetchImpl = cloudflareFetch({ accountId: "acct-1", apiToken: "cf-token" });

  const { result: response } = await withStubbedFetch(
    () =>
      new Response(JSON.stringify({ success: false, errors: [{ code: 1000, message: "Authentication error" }] }), {
        status: 401,
      }),
    () => fetchImpl("https://ignored.example/v1/systemone", typeSafeRequestInit()),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: { message: "Authentication error" } });
});
