import { test } from "node:test";
import assert from "node:assert/strict";
import { anthropicFetch, DEFAULT_ANTHROPIC_MODEL } from "./anthropic.ts";

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

const anthropicMessage = (json: unknown, overrides: Record<string, unknown> = {}) => ({
  model: "claude-haiku-4-5",
  content: [{ type: "text", text: JSON.stringify(json) }],
  usage: { input_tokens: 120, output_tokens: 15 },
  ...overrides,
});

test("anthropicFetch posts a Messages request with a JSON schema built from the questions", async () => {
  const fetchImpl = anthropicFetch({ apiKey: "sk-ant-test" });

  const { calls } = await withStubbedFetch(
    () =>
      new Response(
        JSON.stringify(anthropicMessage({ answers: { completion: { C00: 1 }, has_completion: 0.9 } })),
        { status: 200 },
      ),
    () => fetchImpl("https://ignored.example/v1/systemone", typeSafeRequestInit()),
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.url, "https://api.anthropic.com/v1/messages");
  assert.equal((calls[0]!.init.headers as Record<string, string>)["x-api-key"], "sk-ant-test");

  const sentBody = JSON.parse(String(calls[0]!.init.body));
  assert.equal(sentBody.model, DEFAULT_ANTHROPIC_MODEL);
  assert.equal(sentBody.output_config.format.type, "json_schema");
  const schema = sentBody.output_config.format.schema;
  assert.deepEqual(Object.keys(schema.properties.answers.properties), ["completion", "has_completion"]);
  assert.deepEqual(Object.keys(schema.properties.answers.properties.completion.properties), ["C00"]);
  assert.equal(schema.properties.answers.properties.has_completion.type, "number");
  assert.match(sentBody.messages[0].content, /"typed_so_far":"git st"/);

  // additionalProperties: false is required on every object node -- the API
  // rejects schemas missing it (see the Structured Outputs limitations doc).
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.answers.additionalProperties, false);
  assert.equal(schema.properties.answers.properties.completion.additionalProperties, false);
});

test("anthropicFetch passes a per-request model override through", async () => {
  const fetchImpl = anthropicFetch({ apiKey: "sk-ant-test" });

  const { calls } = await withStubbedFetch(
    () => new Response(JSON.stringify(anthropicMessage({ answers: { completion: { C00: 1 }, has_completion: 1 } })), { status: 200 }),
    () => fetchImpl("https://ignored.example/v1/systemone", typeSafeRequestInit("claude-opus-5")),
  );

  const sentBody = JSON.parse(String(calls[0]!.init.body));
  assert.equal(sentBody.model, "claude-opus-5");
});

test("anthropicFetch converts the model's answer into TypeSafe's { model, answers, usage } shape", async () => {
  const fetchImpl = anthropicFetch({ apiKey: "sk-ant-test" });

  const { result: response } = await withStubbedFetch(
    () =>
      new Response(
        JSON.stringify(anthropicMessage({ answers: { completion: { C00: 0.3, C01: 0.7 }, has_completion: 0.85 } })),
        { status: 200 },
      ),
    () =>
      fetchImpl(
        "https://ignored.example/v1/systemone",
        typeSafeRequestInit() /* body content itself only needs C00 for schema, override below */,
      ),
  );

  const body = (await response.json()) as any;
  assert.equal(body.model, "claude-haiku-4-5");
  assert.equal(body.answers.has_completion.type, "noul");
  assert.equal(body.answers.has_completion.noul, 0.85);
  assert.equal(body.answers.completion.type, "choice");
  assert.equal(body.answers.completion.choice, "C01");
  assert.equal(body.answers.completion.confidence, 0.7);
  assert.deepEqual(body.usage, { input_tokens: 120, output_tokens: 15 });
});

test("anthropicFetch normalizes probabilities that don't sum to 1", async () => {
  const fetchImpl = anthropicFetch({ apiKey: "sk-ant-test" });

  const { result: response } = await withStubbedFetch(
    () =>
      new Response(JSON.stringify(anthropicMessage({ answers: { completion: { C00: 0.2 }, has_completion: 0.5 } })), {
        status: 200,
      }),
    () => fetchImpl("https://ignored.example/v1/systemone", typeSafeRequestInit()),
  );

  const body = (await response.json()) as any;
  // A single candidate at any positive weight normalizes to 1.
  assert.equal(body.answers.completion.probabilities.C00, 1);
});

test("anthropicFetch strips markdown fences a model might wrap around the JSON", async () => {
  const fetchImpl = anthropicFetch({ apiKey: "sk-ant-test" });

  const fenced = "```json\n" + JSON.stringify({ answers: { completion: { C00: 1 }, has_completion: 1 } }) + "\n```";
  const { result: response } = await withStubbedFetch(
    () =>
      new Response(
        JSON.stringify({
          model: "claude-haiku-4-5",
          content: [{ type: "text", text: fenced }],
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
        { status: 200 },
      ),
    () => fetchImpl("https://ignored.example/v1/systemone", typeSafeRequestInit()),
  );

  const body = (await response.json()) as any;
  assert.equal(body.answers.completion.choice, "C00");
});

test("anthropicFetch surfaces a non-2xx Anthropic response as TypeSafe's error shape", async () => {
  const fetchImpl = anthropicFetch({ apiKey: "sk-ant-bad" });

  const { result: response } = await withStubbedFetch(
    () =>
      new Response(JSON.stringify({ error: { type: "authentication_error", message: "invalid x-api-key" } }), {
        status: 401,
      }),
    () => fetchImpl("https://ignored.example/v1/systemone", typeSafeRequestInit()),
  );

  assert.equal(response.status, 401);
  const body = (await response.json()) as any;
  assert.equal(body.error.message, "invalid x-api-key");
});
