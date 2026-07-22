# DICE AI Platform — Architecture

**Status:** Proposed — for review. No implementation until approved.
**Supersedes:** ad-hoc AI access via `aiService.getAIClientAndModel()`.

---

## 1. Why this exists

AI access in DICE is currently point-to-point. `aiService.ts` builds an
OpenAI-compatible client inline, `routes/ai.ts` calls it directly, and
`services/vision/*` reaches back into `aiService` for the same client with a
different model. Prompts are string constants inside the services that use them.
There is no record of what any call cost, how long it took, or whether it
succeeded.

That is workable for two features and untenable for a platform. This document
defines a single path that every AI capability goes through.

**Design commitments**

1. **One entry point.** No service constructs a provider client. Ever.
2. **Configuration is data, not code.** Changing provider or model is an admin
   action, not a deploy.
3. **Observations and conclusions stay separate.** The model reports what it
   sees; deterministic rules decide what that means. This is a safety
   requirement, not a style preference — see §7.
4. **Extension points before extensions.** RAG interfaces ship now, RAG
   implementation ships later, and no existing API changes when it does.

---

## 2. Component map

```
                          ┌─────────────────────────────────┐
   callers                │  AIConfigService                │
   ─────────              │  (RemoteConfig + env fallback)  │
   routes/ai.ts           └──────────────┬──────────────────┘
   visionAnalysisService                 │ resolved AIFeatureConfig
   complianceEngine                      ▼
   (future) ragService     ┌─────────────────────────────────┐
        │                  │       AIRouterService           │
        └─────────────────▶│  selection · retry · fallback   │
                           │  rate limit · timeout · logging │
                           └──────┬───────────────┬──────────┘
                                  │               │
                    ┌─────────────▼──┐      ┌─────▼──────────────┐
                    │ PromptManager  │      │ ProviderAdapter    │
                    │ versioned      │      │ registry           │
                    │ templates      │      └─────┬──────────────┘
                    └────────────────┘            │
                                    ┌─────────────┴──────────────┐
                                    │  nvidia · openai · claude  │
                                    │  gemini · ollama · azure   │
                                    └────────────────────────────┘
                                                  │
                                    ┌─────────────▼──────────────┐
                                    │ AIUsageLog (analytics)     │
                                    └────────────────────────────┘
```

**Directory layout** (all new code under `backend/src/services/ai/`):

```
ai/
  AIRouterService.ts        orchestration: select, call, retry, fall back, log
  AIConfigService.ts        resolve config per feature, cached, hot-reloadable
  PromptManager.ts          versioned prompt retrieval + variable interpolation
  types.ts                  AIRequest/AIResponse, capability enums, errors
  adapters/
    ProviderAdapter.ts      the interface every provider implements
    NvidiaAdapter.ts        OpenAI-compatible, base URL override
    OpenAIAdapter.ts
    AzureOpenAIAdapter.ts   deployment-name routing, api-version param
    ClaudeAdapter.ts        native Messages API
    GeminiAdapter.ts        native generateContent API
    OllamaAdapter.ts        local/self-hosted, no key
    index.ts                registry: name → adapter instance
  knowledge/
    KnowledgeProvider.ts    RAG interface (see §8)
    NullKnowledgeProvider.ts  ships now; returns no context
```

Existing `services/vision/` is retained and refactored to call the router:
`complianceEngine.ts` is unchanged (it is already deterministic and has no AI
dependency); `productVisionService.ts` loses its direct client construction.

---

## 3. Provider adapter layer

### 3.1 The interface

```ts
export type AICapability = 'chat' | 'vision' | 'ocr' | 'embeddings' | 'structured';

export interface ProviderAdapter {
  readonly name: ProviderName;
  /** Declared statically so the router can reject impossible routes up front. */
  supports(capability: AICapability): boolean;

  chat(req: ChatRequest, ctx: AdapterContext): Promise<AIResponse<string>>;
  vision(req: VisionRequest, ctx: AdapterContext): Promise<AIResponse<string>>;
  structured<T>(req: StructuredRequest<T>, ctx: AdapterContext): Promise<AIResponse<T>>;

  ocr?(req: OcrRequest, ctx: AdapterContext): Promise<AIResponse<OcrResult>>;
  embed?(req: EmbedRequest, ctx: AdapterContext): Promise<AIResponse<number[][]>>;

  /** Provider-reported token counts, for cost attribution. */
  extractUsage(raw: unknown): TokenUsage | null;
}
```

`AdapterContext` carries the resolved model, temperature, max tokens, timeout,
API key, base URL, and an `AbortSignal`. Adapters never read `process.env` and
never read the database — everything arrives as arguments. That makes each
adapter a pure, unit-testable translation layer.

### 3.2 Capability matrix

| Provider | chat | vision | ocr | embeddings | structured |
|---|:--:|:--:|:--:|:--:|:--:|
| NVIDIA NIM | ✅ | ✅ | via vision | ✅ | prompt-enforced |
| OpenAI | ✅ | ✅ | via vision | ✅ | native JSON schema |
| Azure OpenAI | ✅ | ✅ | via vision | ✅ | native JSON schema |
| Claude | ✅ | ✅ | via vision | ❌ | tool-call enforced |
| Gemini | ✅ | ✅ | via vision | ✅ | native responseSchema |
| Ollama | ✅ | model-dependent | ❌ | ✅ | format:json |

"via vision" means the provider has no dedicated OCR endpoint and OCR is
performed by the vision model. See §6.2 — this is a real accuracy limitation and
the reason `ocr` is a separate capability rather than an alias for `vision`.

### 3.3 Structured output

Providers differ substantially here, so the adapter normalises:

- **OpenAI / Azure** — `response_format: { type: 'json_schema', strict: true }`
- **Gemini** — `responseMimeType: 'application/json'` + `responseSchema`
- **Claude** — a single forced tool call whose input schema is the target shape
- **NVIDIA / Ollama** — no schema enforcement; prompt instruction plus the
  defensive parser already written for `productVisionService` (fence stripping,
  first-object extraction, field coercion, bounded confidences)

The router validates every structured response against a **Zod schema supplied
by the caller**, regardless of provider. Provider-native enforcement is an
optimisation, never the guarantee. A schema violation is a typed
`AISchemaError`, which is retryable (§4.3).

**Adding a provider = one new file + one registry line.** No changes to the
router, the callers, or the config schema.

---

## 4. AIRouterService

### 4.1 Single entry point

```ts
const result = await aiRouter.run({
  feature: 'vision.product_analysis',   // the config + prompt key
  capability: 'structured',
  prompt: { id: 'vision.product_observations', version: 'active',
            variables: { userHint } },
  images: [{ buffer, mimeType }],
  schema: VisionObservationsSchema,     // Zod — the contract
  actor: { userId, orgId },
});
```

Callers name a **feature**, not a provider. Which provider serves
`vision.product_analysis` is a config lookup at call time.

### 4.2 Selection

1. Resolve `AIFeatureConfig` for the feature (§5).
2. Reject immediately if the feature flag is off → `AIFeatureDisabledError`.
3. Check the adapter declares the capability. If not, go to fallback.
4. Check the rate limit for `(feature, org)`. Reuses the existing
   Redis-backed `makeLimiter` from `middleware/rateLimiters`.
5. Resolve the prompt (§6) with provider-specific override if present.
6. Invoke the adapter under the configured timeout.

### 4.3 Retry and fallback

Two distinct mechanisms; conflating them is how you get surprise bills.

**Retry** — same provider, transient failure. Exponential backoff with jitter.
Retryable: timeout, 429, 5xx, schema violation. Not retryable: 401/403 (bad
key), 400 (malformed request), content filter, feature disabled.

**Fallback** — different provider, after retries are exhausted. Attempted only
when `fallbackProvider` is configured *and* the failure class is
provider-attributable (outage, auth failure, capability gap). A schema violation
does **not** trigger fallback: if our prompt cannot produce valid output on the
primary, sending it to a second paid provider usually fails the same way.

Fallback depth is 1. No chains. Every fallback is logged at `warn` with both
provider names so silent degradation is visible in the dashboard.

### 4.4 What the router guarantees

- No caller ever holds an API key
- Every call is timed, attributed, and logged (§9) — including failures
- Every structured response is schema-valid or an error
- Cost is estimated once, in one place, from one price table

---

## 5. AI configuration

### 5.1 Resolution order

```
RemoteConfig.aiSettings.features[feature]     most specific
  → RemoteConfig.aiSettings.defaults          org-wide default
    → environment variables                   fallback only
      → hardcoded safe defaults               last resort
```

Per your requirement, **environment variables are fallback defaults only**. The
database is authoritative when a value is present.

### 5.2 Schema change — `RemoteConfig.aiSettings`

Current shape is three flat fields (`provider`, `model`, `apiKey`). Proposed:

```ts
aiSettings: {
  // Preserved verbatim for backward compatibility — see §11
  provider: string;
  model: string;
  apiKey: string;

  defaults: {
    temperature: number;        // 0.2
    maxTokens: number;          // 2048
    timeoutMs: number;          // 60000
    retry: { attempts: number; backoffMs: number };  // 2, 500
    fallbackProvider?: ProviderName;
  };

  providers: {
    [name in ProviderName]?: {
      enabled: boolean;
      apiKeyRef: string;        // pointer, NOT the key — see §10.1
      baseUrl?: string;         // Ollama host, Azure endpoint
      apiVersion?: string;      // Azure
      deployment?: string;      // Azure deployment name
      models: { chat?: string; vision?: string; embeddings?: string };
    };
  };

  features: {
    [feature: string]: {
      enabled: boolean;
      provider?: ProviderName;   // omit → defaults.provider
      model?: string;
      temperature?: number;
      maxTokens?: number;
      timeoutMs?: number;
      fallbackProvider?: ProviderName;
      rateLimit?: { windowMs: number; max: number };
    };
  };
}
```

Feature keys are namespaced and stable: `chat.assistant`,
`vision.product_analysis`, `document.analysis`, `compliance.recommendations`,
`embeddings.knowledge`.

### 5.3 Hot reload

Config is cached in-process for 60s and invalidated by the existing Redis
cache-bust on `PUT /config/admin`. A provider switch takes effect within one
minute with no redeploy, no restart, and no in-flight request disruption.

---

## 6. Prompt manager

### 6.1 Storage

New collection `AIPrompt`:

| field | notes |
|---|---|
| `key` | `vision.product_observations` |
| `version` | integer, monotonic per key |
| `status` | `draft` \| `active` \| `archived` — exactly one active per key |
| `template` | text with `{{variable}}` placeholders |
| `variables` | declared names, for validation and admin UI hints |
| `providerOverrides` | `{ [provider]: template }` |
| `notes`, `created_by`, `created_at` | provenance |

**Versioning** — editing creates a new version; it never mutates one.
**Rollback** — flip `status` on an earlier version; an O(1) metadata write.
**Remote editing** — admin panel (§12).
**Variables** — strict interpolation. An undeclared or missing variable throws
rather than emitting a literal `{{x}}` into a prompt.
**Provider overrides** — Claude and Gemini respond better to different system
framing than the Llama models; the override lets us tune per provider without
forking the calling code.

### 6.2 Seeding and the OCR caveat

Initial prompts are seeded from the constants that exist today, so behaviour is
unchanged at cutover: `SYSTEM_PROMPT` from `aiService.ts` and the vision
inspector prompt from `productVisionService.ts`.

**An honest limitation to record now.** Vision LLMs are unreliable at reading
barcode and QR *values* — they will confidently hallucinate a plausible EAN-13.
Prompt engineering cannot fix this. §7.3 addresses it with real decoders. The
`ocr` capability exists as a separate interface so a dedicated engine (AWS
Textract, Tesseract) can be routed independently of the vision model when label
text density warrants it.

---

## 7. Vision and compliance

### 7.1 Multi-image analysis

Up to **10 images** per analysis. Total payload cap 20 MB; per-image cap 4 MB.

Images are treated as **views of one product**, not ten products. The pipeline:

1. Each image is analysed independently (parallel, bounded concurrency 3).
2. Per-image observations are **merged** with provenance: each observation
   records which image index it came from.
3. Conflicts are surfaced, not silently resolved. If image 2 reads "Net Wt.
   200g" and image 5 reads "Net Wt. 250g", both are reported with an explicit
   conflict flag. Compliance data is not a domain where we guess.

Multi-image materially improves the weakest part of single-image analysis:
absence findings. A declaration missing from one face may be present on another,
so confidence in "not visible" rises with coverage. The engine already models
this — absence confidence is currently reduced when image quality is poor, and
will additionally scale with the number of distinct faces captured.

### 7.2 The safety boundary — non-negotiable

The separation shipped in `services/vision/` is preserved and enforced platform-wide:

> **The model reports what is visible. Deterministic rules decide what it means.**

The AI layer may never assert laboratory verification, certification approval,
material composition, RoHS/FCC/BIS/CE status, or any property invisible to a
camera. A mark on packaging is reported as *"this mark is printed on the
artwork"* — never *"this product is certified"*.

This is enforced at three levels:
1. **Prompt** — explicit prohibition (already written).
2. **Schema** — the observation type has no field capable of expressing a
   certification *status*, only a printed-mark *observation*. The shape makes
   the unsafe claim unrepresentable.
3. **Test** — `complianceEngine.test.ts` scans all generated text for forbidden
   claim patterns. This test is extended to cover router output.

**The documentary exception you specified.** A claim like "BIS certified" may be
asserted **only** when backed by an uploaded document. That path is:
`Document` (existing model) → verified by a human or by document analysis →
linked to the analysis as `supportingEvidence` → the finding's `evidence` field
cites the document id. Absent such a link, the claim is not emitted. This reuses
the existing document vault rather than introducing a parallel store.

### 7.3 Barcode and QR — deterministic, not AI

Per §6.2, barcode/QR values come from a **real decoder**, not the LLM. Proposed:
`@zxing/library` (pure TS, no native build, decodes EAN/UPC/Code128/QR) run
server-side on the uploaded buffer.

The LLM may still report *"a barcode is present, lower-right"* as an
observation. The **value** comes only from the decoder. A decoded EAN-13 is then
checksum-validated before it is trusted. This is a correctness requirement: a
hallucinated GTIN in a compliance report is a serious defect.

### 7.4 Structured output contract

Extends the shape already shipped, adding image provenance and evidence links:

```jsonc
{
  "analysisId": "uuid",
  "productCategory": "electronics",
  "productType": "wireless optical mouse",
  "brand": "Logitech",
  "confidence": 0.91,
  "riskScore": 42,

  "detectedText":            [ { "text": "...", "imageIndex": 0, "confidence": 0.9,
                                 "evidence": "...", "reasoning": "..." } ],
  "visibleMarkings":         [ { "mark": "CE", "observation": "printed on rear label",
                                 "imageIndex": 2, "confidence": 0.8, "evidence": "...",
                                 "reasoning": "..." } ],
  "codes":                   [ { "type": "barcode", "symbology": "EAN-13",
                                 "value": "8901063014503", "checksumValid": true,
                                 "source": "decoder" } ],
  "applicableCertifications":[ { "title": "...", "severity": "critical",
                                 "reference": "...", "confidence": 0.7,
                                 "evidence": "...", "reasoning": "..." } ],
  "missingRequirements":     [ ... ],
  "recommendations":         [ ... ],
  "conflicts":               [ { "field": "netQuantity", "values": ["200g","250g"],
                                 "imageIndexes": [1,4] } ],
  "supportingDocuments":     [ { "documentId": "...", "claim": "BIS certified" } ],
  "disclaimer": "...",
  "report": { "pdfUrl": "...", "jsonUrl": "...", "expiresInSeconds": 900 }
}
```

Every conclusion carries `confidence`, `evidence`, `reasoning`. Unchanged from
what ships today — this is the property that makes the output defensible.

---

## 8. Compliance knowledge layer (RAG extension point)

Interfaces now, implementation later, **no API change when it lands**.

```ts
export interface KnowledgeProvider {
  retrieve(query: KnowledgeQuery): Promise<KnowledgeChunk[]>;
  readonly isEnabled: boolean;
}

export interface KnowledgeQuery {
  text: string;
  filters?: { jurisdiction?: string; category?: string; standard?: string };
  topK?: number;
}

export interface KnowledgeChunk {
  id: string;
  content: string;
  source: { title: string; citation: string; url?: string; effectiveDate?: string };
  score: number;
}
```

`NullKnowledgeProvider` ships now and returns `[]`. The router already accepts a
`knowledge?: KnowledgeQuery` on requests and injects retrieved chunks into the
prompt under a dedicated `{{knowledgeContext}}` variable. With the null provider
that variable renders empty and prompts behave exactly as today.

**Why this shape.** When RAG lands, the change is: implement
`PgVectorKnowledgeProvider` (or Atlas Vector Search — see §14), register it, set
a flag. No route signature changes, no caller changes, no schema changes.

**Critically:** retrieved regulatory text becomes **evidence**, not authority. A
finding sourced from RAG cites its chunk in `evidence`. The deterministic engine
still owns the conclusion. RAG must never become a backdoor for the model to
assert certification status.

---

## 9. AI analytics

New collection `AIUsageLog`, one document per router invocation:

| field | purpose |
|---|---|
| `feature`, `capability` | what was asked |
| `provider`, `model` | who served it (post-fallback) |
| `attemptedProvider` | set when fallback occurred |
| `latencyMs`, `queuedMs` | performance |
| `promptTokens`, `completionTokens` | from `extractUsage` |
| `estimatedCostUsd` | tokens × price table, versioned |
| `success`, `errorCode`, `errorClass` | outcome |
| `retryCount`, `usedFallback`, `schemaValid` | reliability |
| `userId`, `orgId` | attribution |
| `promptKey`, `promptVersion` | ties quality regressions to prompt changes |
| `ts` | time series |

Indexes: `{ ts: -1 }`, `{ orgId, ts: -1 }`, `{ feature, ts: -1 }`,
`{ provider, success, ts: -1 }`.

**Retention:** 180 days via TTL index. Prompts and completions are **not**
stored by default — only metadata. Storing customer product data in an
analytics collection creates a data-protection liability with no operational
benefit. An opt-in per-feature `logPayloads` flag exists for debugging, gated to
`super_admin` and off by default.

Cost is *estimated*, and labelled as such everywhere it appears. Provider
billing is authoritative; the price table drifts.

---

## 10. Security

### 10.1 API key storage — two live defects to fix

The audit turned up two issues in the current implementation that this design
must not carry forward:

1. **Keys are stored in plaintext in MongoDB** (`aiSettings.apiKey`). Anyone
   with a database dump, a backup, or read access to that collection has every
   provider key. `backend/dump.rdb` sitting untracked in the repo makes this
   concrete rather than theoretical.
2. **`GET /config/admin` returns the plaintext key in the response body.** The
   public `GET /config` correctly strips it; the admin route does not. Any
   admin session, browser cache, or proxy log now holds the key.

**Proposed remediation:**

- Keys move to `AIProviderCredential`, a separate collection, encrypted at rest
  with AES-256-GCM under a `CONFIG_ENCRYPTION_KEY` held only in the environment.
  `aiSettings.providers[x].apiKeyRef` stores a reference, never the value.
- No API route returns a key. Ever. The admin UI shows presence, last-4, and
  last-rotated; writes are set-only.
- Key material is redacted from logs, audit records, and error messages.
- A key-rotation endpoint records the actor in `AuditLog` without the value.

Migration for existing keys is described in §11.

### 10.2 Other considerations

- **Authorisation** — AI config is `admin`/`super_admin` only, via the existing
  `requireRole`. Prompt editing is `super_admin` only: a prompt is executable
  configuration, and the ability to rewrite the system prompt is equivalent to
  code deployment.
- **SSRF** — `baseUrl` (Ollama, Azure) is operator-supplied and becomes an
  outbound request target. It must be validated against an allowlist and must
  reject link-local and private ranges unless explicitly permitted, or the AI
  config becomes an SSRF primitive against internal services.
- **Prompt injection** — text extracted from a product image is untrusted input.
  It is passed to the compliance engine as *data* and never concatenated into a
  system prompt. The deterministic engine is structurally immune: it pattern-
  matches text, it does not follow it.
- **PII** — product photographs may incidentally capture people or documents.
  Images stay in memory and are never persisted (already true today); §9 keeps
  them out of analytics.
- **Rate limiting** — per-feature and per-org, on the existing Redis limiter.
  Prevents a single tenant exhausting a shared quota or budget.
- **Tenant isolation** — every log and every knowledge query is scoped by
  `orgId`. When RAG lands, org-private documents must not be retrievable
  cross-tenant; the `KnowledgeQuery` filter carries `orgId` from the start.

---

## 11. Migration strategy

Five phases, each independently shippable and reversible. No big-bang cutover.

**Phase 1 — Foundation, no behaviour change.**
Add router, config service, adapters for NVIDIA and OpenAI, usage logging.
Nothing calls it yet. Ships dark.

**Phase 2 — Config migration.**
Extend `aiSettings` additively; existing `provider`/`model`/`apiKey` are
retained and read as the seed for `defaults` and the NVIDIA/OpenAI provider
entries. A one-shot idempotent migration script moves the plaintext key into
the encrypted credential store and replaces it with a ref. Legacy fields are
kept readable for one release so a rollback is possible, then removed.

**Phase 3 — Cut over existing callers.**
`aiService.chat` and `productVisionService` route through `AIRouterService`.
`getAIClientAndModel` is deleted. This is the only phase with regression risk;
it is covered by the existing 96 tests plus router contract tests. Behaviour
must be identical — same provider, same model, same prompts (seeded verbatim).

**Phase 4 — Remaining providers and prompt manager.**
Claude, Gemini, Ollama, Azure adapters. Prompts move from constants to
`AIPrompt` records, seeded from the current constants so output is unchanged.

**Phase 5 — Vision extensions.**
Multi-image, ZXing barcode/QR decoding, conflict detection, JSON report
artefact alongside the PDF.

RAG is explicitly **not** in this plan. Its extension points ship in Phase 1;
its implementation is a separate project.

---

## 12. Admin panel changes

New **AI Platform** section (extends the existing `RemoteConfigPage`):

- **Providers** — enable/disable, model per capability, base URL, key status
  (present / last-4 / rotated-at) with set-only writes, and a **Test
  connection** action that performs a minimal live call and reports latency.
- **Features** — per-feature provider/model/temperature/tokens/timeout/
  fallback/rate-limit, and an enable toggle.
- **Prompts** — list by key, version history, diff between versions, edit
  (creates a draft), activate, roll back. `super_admin` only.
- **Usage** — spend and latency by provider/feature/org over time, error rate,
  fallback rate, top consumers. Reads `AIUsageLog`.

---

## 13. API surface

| Method | Path | Role | Purpose |
|---|---|---|---|
| `POST` | `/ai/analyze-product-images` | auth | Multi-image analysis (up to 10) |
| `POST` | `/ai/product-report` | auth | Regenerate PDF + JSON artefacts |
| `GET` | `/ai/analyses/:id` | auth | Retrieve a stored analysis |
| `GET` | `/config/admin/ai` | admin | AI config **without** key material |
| `PUT` | `/config/admin/ai` | admin | Update providers/features |
| `POST` | `/config/admin/ai/credentials/:provider` | super_admin | Set/rotate a key |
| `POST` | `/config/admin/ai/test/:provider` | admin | Live connectivity check |
| `GET` | `/admin/ai/prompts` | super_admin | List with versions |
| `POST` | `/admin/ai/prompts/:key/versions` | super_admin | Create a version |
| `POST` | `/admin/ai/prompts/:key/activate` | super_admin | Activate / roll back |
| `GET` | `/admin/ai/usage` | admin | Analytics, filterable |

**Backward compatibility:** the existing `POST /ai/analyze-product-image`
(singular) is retained as a thin wrapper over the multi-image endpoint. The
mobile client shipped in `19d73d3` keeps working with no change.

---

## 14. Open decisions — I need your call

These change the design materially and I will not guess them.

1. **Vector store for future RAG.** MongoDB Atlas Vector Search keeps everything
   in one datastore and adds no infrastructure, but requires Atlas (not
   self-hosted Mongo). pgvector is stronger but adds Postgres to a stack that
   currently has none. **Which is acceptable?** This affects the
   `KnowledgeProvider` interface only slightly, but it affects infrastructure
   planning a lot.

2. **Is Ollama actually in scope?** It implies self-hosted GPU infrastructure.
   Including the adapter is cheap; provisioning to serve production compliance
   analysis is not. Adapter only, or a real deployment target?

3. **Cost controls.** Should a per-org monthly spend cap **hard-stop** AI
   features, or warn and continue? A hard stop is safer commercially and worse
   for users mid-workflow. This needs a product decision, not an engineering one.

4. **Do the two key-storage defects (§10.1) get fixed immediately**, ahead of
   this programme? They are live now. I would treat them as a standalone
   security fix rather than waiting for Phase 2 — but that is your call on
   sequencing.

5. **Prompt editing in production.** A bad system prompt is a production
   incident with no code review and no CI. I strongly recommend prompt
   activation require a second approver, or at minimum be restricted to
   `super_admin` with full audit. Confirm which.

---

## 15. What this does not do

Stated plainly so scope is not assumed:

- No RAG ingestion, chunking, embedding, or retrieval implementation
- No fine-tuning or model hosting
- No streaming responses (the current UX is request/response; adding streaming
  later changes the adapter interface and should be designed deliberately)
- No agentic/multi-step tool use
- No automatic prompt optimisation or evaluation harness — worth doing, but a
  separate project with its own dataset requirements
