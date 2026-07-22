# DICE Compliance Knowledge Layer (RAG) — Architecture

**Status:** Proposed — design only. No implementation.
**Companion to:** [ai-platform-architecture.md](./ai-platform-architecture.md)
**Position:** Core platform component, not a bolt-on.

---

## 1. What this is for

DICE advises on certification. The regulations it advises against — BIS Quality
Control Orders, FSSAI labelling regulations, CDSCO device rules, EU directives —
are large, jurisdiction-specific, amended frequently, and consequential when
misquoted.

Two hard requirements shape everything below:

1. **Every regulatory statement must be traceable to a source document, clause,
   and version.** "The model said so" is not an acceptable provenance chain when
   a customer files a certification application on the strength of it.
2. **Retrieved text is evidence, never authority.** RAG supplies *what a
   regulation says*. The deterministic compliance engine still decides *what
   applies*. If RAG could drive conclusions directly, it would become a backdoor
   around the safety boundary in the platform doc §7.2.

A regulation that has been superseded is worse than no regulation at all, so
**versioning and effective dates are first-class**, not metadata added later.

---

## 2. Component map

```
  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │ Admin upload │   │ Scheduled    │   │ Existing     │
  │ (PDF/DOCX)   │   │ source crawl │   │ Document     │
  └──────┬───────┘   └──────┬───────┘   │ vault (org)  │
         │                  │           └──────┬───────┘
         └────────┬─────────┴──────────────────┘
                  ▼
        ┌─────────────────────┐
        │ IngestionPipeline   │  extract → normalise → chunk → embed → upsert
        └──────────┬──────────┘
                   ▼
        ┌─────────────────────┐      ┌────────────────────────┐
        │ VectorStoreAdapter  │◀────▶│ Qdrant (initial)       │
        │  (interface)        │      │ pgvector / Atlas later │
        └──────────┬──────────┘      └────────────────────────┘
                   ▲
                   │
        ┌──────────┴──────────┐
        │ RetrievalService    │  hybrid search → filter → rerank → assemble
        └──────────┬──────────┘
                   ▼
        ┌─────────────────────┐
        │ KnowledgeProvider   │  ← the interface AIRouterService already calls
        └──────────┬──────────┘
                   ▼
        ┌─────────────────────┐
        │ ComplianceEngine    │  deterministic; cites chunks as evidence
        └─────────────────────┘
```

Directory: `backend/src/services/ai/knowledge/`

```
knowledge/
  KnowledgeProvider.ts          interface (ships in Phase 1)
  NullKnowledgeProvider.ts      returns [] (ships in Phase 1)
  RagKnowledgeProvider.ts       real implementation (later phase)
  RetrievalService.ts           hybrid search, filtering, reranking
  IngestionPipeline.ts          orchestration
  chunking/
    ChunkingStrategy.ts         interface
    LegalClauseChunker.ts       clause-aware, the default for regulations
    RecursiveChunker.ts         fallback for unstructured text
  extract/
    DocumentExtractor.ts        PDF/DOCX/HTML → normalised text + layout
  rerank/
    Reranker.ts                 interface
    CrossEncoderReranker.ts     provider-backed
    NullReranker.ts             identity, for dev
  vector/
    VectorStoreAdapter.ts       interface
    QdrantAdapter.ts            initial target
    PgVectorAdapter.ts          later
    AtlasVectorAdapter.ts       later
```

---

## 3. VectorStoreAdapter

Per the decision, Qdrant is the initial target with the interface built so
pgvector or Atlas Vector Search can replace it without touching callers.

```ts
export interface VectorStoreAdapter {
  readonly name: 'qdrant' | 'pgvector' | 'atlas';

  ensureCollection(spec: CollectionSpec): Promise<void>;

  upsert(collection: string, points: VectorPoint[]): Promise<void>;
  deleteByFilter(collection: string, filter: VectorFilter): Promise<number>;

  search(collection: string, query: VectorQuery): Promise<VectorHit[]>;
  /** Sparse/keyword leg of hybrid search — see §7.2 for the fallback path. */
  searchText?(collection: string, query: TextQuery): Promise<VectorHit[]>;

  health(): Promise<{ ok: boolean; detail?: string }>;
}

export interface VectorPoint {
  id: string;                    // deterministic: sha256(docId:version:chunkIndex)
  vector: number[];
  sparseVector?: Record<number, number>;   // Qdrant native sparse, when available
  payload: ChunkPayload;
}

export interface VectorQuery {
  vector: number[];
  sparseVector?: Record<number, number>;
  filter?: VectorFilter;         // translated per store
  topK: number;
  scoreThreshold?: number;
}
```

**Why Qdrant first.** Native hybrid search (dense + sparse in one query),
first-class payload filtering that is applied *during* search rather than after
(critical for permissions — §8), straightforward self-hosting via Docker
alongside the existing `docker-compose.yml`, and no dependency on a managed
Mongo tier.

**Portability constraints the interface deliberately enforces:**

- Filters are expressed in a store-neutral `VectorFilter` AST and translated by
  each adapter. Callers never write Qdrant filter JSON.
- `searchText` is optional. pgvector reaches hybrid via `tsvector`; Atlas via
  its own text index; if a store cannot do sparse retrieval, `RetrievalService`
  degrades to dense-only and records that in the response (§7.2).
- Point IDs are deterministic and content-addressed, so re-ingestion is
  idempotent and a store migration is a re-index, not a data reconciliation.

**Collections** (one per embedding model — dimensions are not interchangeable):
`compliance_knowledge__{embeddingModelSlug}`. Switching embedding models means
building a new collection and cutting over, never mutating in place (§6.3).

---

## 4. Corpus and sources

Three source classes, with different trust levels and different permissions:

| Class | Example | Scope | Trust |
|---|---|---|---|
| `regulation` | BIS QCO, FSSAI Labelling Regs, MDR 2017 | global | authoritative, citable |
| `guidance` | BIS procedural handbooks, CDSCO FAQs | global | citable, secondary |
| `org_document` | a tenant's own test reports, certificates | single org | evidence for that org only |

`org_document` reuses the existing `Document` vault rather than introducing a
parallel store — the ingestion pipeline reads from it, and permissions inherit
from it (§8). This is what makes the documentary-evidence exception in the
platform doc §7.2 workable: a claim like "BIS certified" can cite a specific
clause of a specific uploaded certificate.

---

## 5. Ingestion

### 5.1 Pipeline

```
source → extract → normalise → segment → chunk → embed → upsert → index manifest
```

Ingestion is a **job**, not a request. It runs through the existing
`backend/src/jobs/` infrastructure so a large regulation does not block a
request thread. Each run produces an `IngestionRun` record with counts,
failures, and duration.

### 5.2 Extraction

- **PDF** — text layer first; fall back to OCR when the page has no text layer
  (scanned gazette notifications are common in this domain). OCR routes through
  the platform's `ocr` capability, so the provider is configurable.
- **DOCX/HTML** — structural extraction preserving heading hierarchy.
- **Layout retention** — headings, clause numbers, table boundaries and page
  numbers are preserved as structure, because citations must resolve to a
  clause and a page.

Tables are extracted as tables. Regulatory thresholds live in tables, and a
table flattened into prose loses the row/column relationship that gives a number
its meaning.

### 5.3 Chunking

Default is `LegalClauseChunker`, not fixed-size splitting. Regulations are
hierarchical (Part → Chapter → Rule → Sub-rule) and a chunk that straddles two
rules produces a citation that is wrong in a way no reviewer will notice.

Rules:
- Split on clause boundaries first; never mid-clause.
- Target 500–900 tokens; hard ceiling 1200.
- Oversized single clauses split on sentence boundaries with 15% overlap, and
  every part inherits the parent clause id.
- Each chunk carries its **heading path** (`Part II → Chapter 4 → Rule 6(1)(a)`)
  prepended as context. A chunk that reads "the name and address shall be
  declared" is useless without knowing which rule it belongs to.
- Tables are never split across chunks.

`RecursiveChunker` is the fallback for unstructured sources.

### 5.4 Chunk payload

```ts
interface ChunkPayload {
  chunkId: string;
  documentId: string;
  documentVersion: number;

  sourceClass: 'regulation' | 'guidance' | 'org_document';
  orgId: string | null;          // null = global corpus; set = tenant-private

  jurisdiction: string;          // 'IN', 'EU', 'US', 'SA'
  authority: string;             // 'BIS', 'FSSAI', 'CDSCO', 'CPCB'
  category?: string[];           // product categories this applies to
  standardRefs?: string[];       // 'IS 9873', 'IS 13252'

  headingPath: string;
  clauseRef?: string;            // 'Rule 6(1)(a)'
  pageFrom?: number;
  pageTo?: number;

  language: string;              // BCP-47
  effectiveFrom?: string;        // ISO date
  effectiveTo?: string | null;   // null = currently in force
  supersededBy?: string;

  contentHash: string;
  text: string;
}
```

`effectiveFrom` / `effectiveTo` are the fields that keep this system honest.
Superseded regulations are **retained, not deleted** — historical questions
("what applied when this consignment shipped?") are legitimate — but are
excluded from retrieval by default (§7.3).

### 5.5 Idempotency and incremental update

Point IDs are `sha256(documentId:version:chunkIndex)`; payloads carry
`contentHash`. Re-ingesting an unchanged document is a no-op. Re-ingesting a
changed one upserts changed chunks and deletes orphans by filter. An interrupted
run is safely resumable.

---

## 6. Embeddings

### 6.1 Routing

Embeddings go through `AIRouterService` with capability `embeddings`, so the
provider is remote-configurable exactly like chat and vision. No separate
credential path, no separate client.

### 6.2 Multilingual

Non-negotiable for this corpus: Indian packaging is routinely bilingual
(English + Hindi), FSSAI and LMPC declarations appear in regional scripts, and
Saudi PCoC work involves Arabic.

- Embedding model **must** be multilingual (e.g. `multilingual-e5-large`,
  `text-embedding-3-large`). A monolingual English model silently fails on Hindi
  and Arabic — it returns results, they are just wrong.
- Source language is detected at ingestion and stored as `language`.
- **Cross-lingual retrieval is intended**: a Hindi query should match an English
  regulation. Language is a *ranking signal*, not a hard filter, so it must not
  be used to exclude by default.
- Chunk text is embedded in its original language. Translation at ingestion
  would introduce an unciteable derived text — the citation must resolve to what
  the gazette actually says.

### 6.3 Model changes

Embedding dimensions are model-specific, so a model change is a re-index:
build the new collection alongside the old, verify with the evaluation set
(§13), cut over by config, retain the old collection for one release. The
collection-per-model naming makes this mechanical.

---

## 7. Retrieval

### 7.1 Flow

```
query → expand → embed → hybrid search (dense + sparse)
      → permission filter (in-store) → temporal filter
      → rerank → diversify → assemble context + citations
```

### 7.2 Hybrid search

Dense-only retrieval fails on this corpus in a specific, predictable way:
regulatory identifiers (`IS 9873`, `Rule 6(1)(a)`, `MD-15`) are near-meaningless
to a semantic embedding but are exactly what users search for. Sparse/keyword
retrieval handles them precisely.

- Dense: top 50. Sparse (BM25/SPLADE): top 50.
- Fused with **Reciprocal Rank Fusion** (`k=60`) — RRF needs no score
  normalisation across two differently-scaled retrievers, which is where naive
  weighted blending goes wrong.
- If the adapter lacks `searchText`, retrieval degrades to dense-only and sets
  `degraded: 'dense_only'` on the response so the quality drop is visible rather
  than silent.

### 7.3 Filtering

Applied **inside** the vector search, not as a post-filter. Post-filtering
silently shrinks result sets below `topK` and, for permissions, is a data-leak
waiting to happen (§8).

- **Permission** — `orgId ∈ {null, callerOrgId}`. Always applied. Never optional.
- **Temporal** — default `effectiveTo IS NULL OR effectiveTo > now`. Superseded
  text is excluded unless the caller explicitly requests a historical `asOf`
  date.
- **Jurisdiction / authority / category** — supplied by the compliance engine
  from the product analysis, and this is the highest-leverage filter available:
  an electronics query should not retrieve FSSAI labelling rules.

### 7.4 Reranking

Fusion output (~50 candidates) is reranked to the final 5–8 by a cross-encoder,
behind a `Reranker` interface with a `NullReranker` for development.

Reranking matters more here than in general RAG because clause-level chunks are
lexically similar to each other — a dozen LMPC sub-rules all read alike, and
bi-encoder similarity struggles to separate them.

**Diversification:** cap chunks per source document (default 3) so one long
regulation cannot monopolise the context window and crowd out a second
applicable instrument.

### 7.5 Citations

Every returned chunk carries a citation resolvable to a human-verifiable
location:

```jsonc
{
  "chunkId": "...",
  "score": 0.83,
  "content": "...",
  "citation": {
    "title": "Legal Metrology (Packaged Commodities) Rules, 2011",
    "authority": "Department of Consumer Affairs",
    "clauseRef": "Rule 6(1)(a)",
    "headingPath": "Chapter II → Declarations on pre-packed commodities",
    "pages": [14, 15],
    "documentVersion": 7,
    "effectiveFrom": "2022-10-01",
    "url": "https://…"
  }
}
```

**Rule: no citation, no claim.** A finding that cannot cite a chunk does not
reach the report as a regulatory statement. This is enforced in the compliance
engine, not left to the prompt.

---

## 8. Permissions and tenant isolation

The highest-severity risk in this component: one tenant's confidential test
reports and certificates surfacing in another tenant's analysis.

**Controls:**

1. `orgId` is a mandatory payload field on every point. Global corpus is `null`.
2. The permission filter is applied **in-store, during search** — not after.
3. `RetrievalService` takes `orgId` from the authenticated request context, and
   there is no parameter by which a caller can supply it. It cannot be spoofed
   by request body.
4. A defence-in-depth assertion re-checks `orgId` on every hit before assembly;
   a mismatch is a hard error and a security-level audit event, not a filter.
5. Ingestion of an `org_document` inherits its ACL from the existing `Document`
   record. Deleting the document deletes its chunks — a soft-deleted document's
   chunks are removed from the index, not merely hidden.
6. Test coverage: a cross-tenant retrieval attempt is an explicit test case,
   in the same spirit as the existing mass-assignment suite.

Cache keys include `orgId` (§10) — a shared cache is otherwise a bypass of every
control above.

---

## 9. Versioning and lifecycle

- `KnowledgeDocument` holds identity and current version; `KnowledgeDocumentVersion`
  holds each ingested revision with `effectiveFrom` / `effectiveTo`.
- Amendments create a new version; the prior version is marked superseded with
  `supersededBy` and retained.
- Retrieval is **as-of aware**: default "in force now", optional historical
  `asOf` date.
- Reports record the `documentVersion` of every cited chunk, so a report can be
  reproduced exactly even after the regulation changes. This matters for audit
  and for disputes.

---

## 10. Caching

Three layers, each with a different invalidation trigger:

| Layer | Key | TTL | Invalidated by |
|---|---|---|---|
| Query embedding | `emb:{model}:{sha256(text)}` | 7d | embedding model change |
| Retrieval result | `ret:{orgId}:{model}:{sha256(query+filters)}` | 1h | any ingestion run touching matching filters |
| Rerank result | `rr:{model}:{sha256(candidateIds+query)}` | 1h | reranker model change |

On the existing Redis. **`orgId` is in the retrieval cache key** — see §8.

Embedding caching is the highest-value layer: identical queries recur constantly
(the compliance engine issues templated queries per category) and embedding
calls are billed per token.

---

## 11. Integration with the compliance engine

RAG does **not** change the engine's authority. The flow:

1. Vision produces observations (unchanged).
2. The deterministic engine determines applicable schemes from category (unchanged).
3. **New:** for each finding, the engine issues a targeted retrieval
   (`jurisdiction`, `authority`, `category`, `standardRefs`) to fetch the
   governing clause text.
4. Retrieved clauses attach to the finding as `citations[]`, enriching
   `evidence` and `reference`.
5. The finding's *existence and severity* remain rule-determined.

So RAG makes findings **better-evidenced**, not different. If retrieval returns
nothing, findings still render — with the reference string they carry today.
Degradation is graceful by construction.

Retrieved regulatory text is **untrusted input** with respect to prompt
injection (a PDF can contain adversarial text). It is passed as data to the
deterministic engine, never concatenated into a system prompt as instructions.

---

## 12. Data model additions

| Collection | Purpose |
|---|---|
| `KnowledgeDocument` | source identity, authority, jurisdiction, class, ACL |
| `KnowledgeDocumentVersion` | per-revision text, effective dates, supersession |
| `KnowledgeChunkIndex` | chunk → vector point id map, for reconciliation/deletion |
| `IngestionRun` | job audit: counts, failures, duration, actor |

Vectors live in Qdrant; Mongo holds authoritative metadata. Qdrant is treated as
a **derived index that can be rebuilt from Mongo at any time** — it is never the
system of record.

---

## 13. Evaluation

Retrieval quality regressions are silent without measurement, so this ships with
the component rather than after it.

- A curated set of ~100 compliance questions with known-correct clause answers,
  built from real consultancy queries.
- Metrics: recall@10, MRR, citation precision (does the cited clause actually
  support the statement).
- Run on: embedding model change, chunking change, reranker change, major
  corpus update.
- Gate: a cutover to a new embedding model requires no regression against the
  incumbent.

---

## 14. Phasing

RAG is a core component but not Phase 1. Sequence, after the platform phases:

| Phase | Content |
|---|---|
| **R0** | Interfaces only — `KnowledgeProvider`, `VectorStoreAdapter`, `NullKnowledgeProvider`. Ships with platform Phase 1. Zero behaviour change. |
| **R1** | Qdrant adapter, embeddings routing, ingestion for a single seed corpus (LMPC + one QCO), dense-only retrieval. Internal only, behind a feature flag. |
| **R2** | Hybrid search, clause-aware chunking, citations wired into compliance findings. |
| **R3** | Reranking, caching, multilingual corpus, evaluation harness. |
| **R4** | `org_document` ingestion from the vault — unlocks the documentary-evidence exception. Gated on the §8 isolation tests passing. |

---

## 15. Open questions

1. **Corpus licensing.** Indian gazette notifications are government works, but
   BIS standards themselves (the IS documents) are **copyrighted and sold by
   BIS**. Ingesting full IS standard text may not be licensable. I would scope
   R1 to freely reproducible instruments (QCOs, gazette rules, FSSAI
   regulations) and treat IS standards as *referenced by number only* until
   licensing is confirmed. **This needs a legal answer before ingestion, not
   after.**

2. **Qdrant hosting** — self-hosted alongside the existing compose stack, or
   Qdrant Cloud? Affects backup, HA, and data-residency posture (the `User`
   model already carries `country_code` for residency reasons).

3. **Reranker provider** — Cohere Rerank is strongest but adds a seventh
   vendor; a cross-encoder served via the existing NVIDIA NIM endpoint keeps the
   vendor count flat at some quality cost.

4. **Who curates the corpus?** Ingestion quality is a compliance-expertise task,
   not an engineering one. This needs a named owner with a review workflow, or
   the index will drift out of date and become actively harmful.
