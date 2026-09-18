import { test } from "node:test";
import assert from "node:assert/strict";
import { groqFetch, DEFAULT_GROQ_MODEL } from "./groq.ts";

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

const typeSafeRequestInit = (model?: string): RequestInit => ({
  method: "POST",
  body: JSON.stringify({
    state: { typed_so_far: "git st", recent_commands: "C00| git status" },
    questions: {
      completion: {
        type: "choice",
        instructions: "Which command are they typing?",
        criteria: { C00: "git status" },
      },
      has_completion: {
        type: "noul",
        instructions: "Does anything match?",
        criteria: { true: "some match", false: "no match" },
      },
    },
    ...(model ? { model } : {}),
  }),
});

const groqCompletion = (json: unknown, overrides: Record<string, unknown> = {}) => ({
  model: DEFAULT_GROQ_MODEL,
  choices: [{ message: { role: "assistant", content: JSON.stringify(json) } }],
  usage: { prompt_tokens: 130, completion_tokens: 12, total_tokens: 142 },
  ...overrides,
});

test("groqFetch posts a chat completions request with a strict JSON schema built from the questions", async () => {
  const fetchImpl = groqFetch({ apiKey: "gsk-test" });

  const { calls } = await withStubbedFetch(
    () =>
      new Response(
        JSON.stringify(groqCompletion({ answers: { completion: { C00: 1 }, has_completion: 0.9 } })),
        { status: 200 },
      ),
    () => fetchImpl("https://ignored.example/v1/systemone", typeSafeRequestInit()),
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.url, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal((calls[0]!.init.headers as Record<string, string>)["authorization"], "Bearer gsk-test");

  const sentBody = JSON.parse(String(calls[0]!.init.body));
  assert.equal(sentBody.model, DEFAULT_GROQ_MODEL);
  assert.equal(sentBody.response_format.type, "json_schema");
  assert.equal(sentBody.response_format.json_schema.strict, true);
  const schema = sentBody.response_format.json_schema.schema;
  assert.deepEqual(Object.keys(schema.properties.answers.properties), ["completion", "has_completion"]);
  assert.deepEqual(Object.keys(schema.properties.answers.properties.completion.properties), ["C00"]);
  assert.equal(schema.properties.answers.properties.has_completion.type, "number");
  assert.match(sentBody.messages[1].content, /"typed_so_far":"git st"/);
  assert.equal(sentBody.messages[0].role, "system");

  // additionalProperties: false is required on every object node in strict mode --
  // the API rejects schemas missing it (see the Structured Outputs docs' mandatory
  // constraints section).
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.answers.additionalProperties, false);
  assert.equal(schema.properties.answers.properties.completion.additionalProperties, false);
});

test("groqFetch passes a per-request model override through", async () => {
  const fetchImpl = groqFetch({ apiKey: "gsk-test" });

  const { calls } = await withStubbedFetch(
    () =>
      new Response(JSON.stringify(groqCompletion({ answers: { completion: { C00: 1 }, has_completion: 1 } })), {
        status: 200,
      }),
    () => fetchImpl("https://ignored.example/v1/systemone", typeSafeRequestInit("openai/gpt-oss-120b")),
  );

  const sentBody = JSON.parse(String(calls[0]!.init.body));
  assert.equal(sentBody.model, "openai/gpt-oss-120b");
});

test("groqFetch converts the model's answer into TypeSafe's { model, answers, usage } shape", async () => {
  const fetchImpl = groqFetch({ apiKey: "gsk-test" });

  const { result: response } = await withStubbedFetch(
    () =>
      new Response(
        JSON.stringify(groqCompletion({ answers: { completion: { C00: 0.3, C01: 0.7 }, has_completion: 0.85 } })),
        { status: 200 },
      ),
    () => fetchImpl("https://ignored.example/v1/systemone", typeSafeRequestInit()),
  );

  const body = (await response.json()) as any;
  assert.equal(body.model, DEFAULT_GROQ_MODEL);
  assert.equal(body.answers.has_completion.type, "noul");
  assert.equal(body.answers.has_completion.noul, 0.85);
  assert.equal(body.answers.completion.type, "choice");
  assert.equal(body.answers.completion.choice, "C01");
  assert.equal(body.answers.completion.confidence, 0.7);
  assert.deepEqual(body.usage, { input_tokens: 130, output_tokens: 12 });
});

test("groqFetch normalizes probabilities that don't sum to 1", async () => {
  const fetchImpl = groqFetch({ apiKey: "gsk-test" });

  const { result: response } = await withStubbedFetch(
    () =>
      new Response(JSON.stringify(groqCompletion({ answers: { completion: { C00: 0.2 }, has_completion: 0.5 } })), {
        status: 200,
      }),
    () => fetchImpl("https://ignored.example/v1/systemone", typeSafeRequestInit()),
  );

  const body = (await response.json()) as any;
  // A single candidate at any positive weight normalizes to 1.
  assert.equal(body.answers.completion.probabilities.C00, 1);
});

test("groqFetch surfaces a non-2xx Groq response as TypeSafe's error shape", async () => {
  const fetchImpl = groqFetch({ apiKey: "gsk-bad" });

  const { result: response } = await withStubbedFetch(
    () =>
      new Response(
        JSON.stringify({ error: { message: "Invalid API Key", type: "invalid_request_error" } }),
        { status: 401 },
      ),
    () => fetchImpl("https://ignored.example/v1/systemone", typeSafeRequestInit()),
  );

  assert.equal(response.status, 401);
  const body = (await response.json()) as any;
  assert.equal(body.error.message, "Invalid API Key");
});

test("groqFetch surfaces malformed JSON in the message content as a 502", async () => {
  const fetchImpl = groqFetch({ apiKey: "gsk-test" });

  const { result: response } = await withStubbedFetch(
    () =>
      new Response(
        JSON.stringify({
          model: DEFAULT_GROQ_MODEL,
          choices: [{ message: { role: "assistant", content: "not json" } }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
        { status: 200 },
      ),
    () => fetchImpl("https://ignored.example/v1/systemone", typeSafeRequestInit()),
  );

  assert.equal(response.status, 502);
  const body = (await response.json()) as any;
  assert.match(body.error.message, /not valid JSON/);
});
