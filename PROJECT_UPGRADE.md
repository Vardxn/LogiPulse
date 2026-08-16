# LogiPulse Production-Grade Upgrade

This document outlines the architectural enhancements introduced to upgrade LogiPulse from a functional MVP to an enterprise-ready Supply Chain Routing platform.

## Architecture Evolution

### Hybrid RAG & Vector Search
- **Before:** Direct ingestion of OCR text payload to GPT-4o.
- **After:** Document content is chunked and embedded via OpenAI `text-embedding-3-small`. Embeddings are stored natively in PostgreSQL using the `pgvector` extension.
- **Retrieval:** A custom Reciprocal Rank Fusion (RRF) algorithm computes a weighted score between PostgreSQL native Full-Text Search (BM25 equivalent) and Cosine Distance vector search. This guarantees both semantic relevance and exact keyword matching.

### Citation Enforcement & RAG Evaluation
- **LLM-as-a-Judge Eval:** Implemented a `/eval` regression testing endpoint to score Faithfulness, Answer Relevance, and Context Precision on a Golden Dataset. Results are versioned in Postgres.
- **Citations:** Modified GPT-4o retrieval prompts to mandate strict `JSON Schema` output with an array of chunk IDs and excerpts. Added a `/verify-citations` endpoint that algorithmically cross-references the LLM-generated citations against the pgvector database to proactively block hallucinations.

### Observability & Telemetry
- **LLM Telemetry Interceptor:** Wrapped all OpenAI API calls inside a `TelemetryOpenAI` utility. Tracks request tokens, response tokens, model type, compute latency, and calculates the live USD cost of the call. Saved as a timeseries in MongoDB.
- **Prometheus Metrics:** Integrated `prom-client` to expose a standard `/metrics` endpoint tracking p95 latency for the OCR extraction pipeline, RAG generation, and Dijkstra/A* routing graph compute.

### Multi-Tenant Security & Isolation
- **Prisma RLS Extension:** Implemented a Prisma Client Extension that hooks into the query lifecycle (via `$allOperations`) and automatically injects `{ tenantId: '...' }` into the `WHERE` clause. This ensures a developer cannot accidentally leak data across tenants.
- **Redis Rate Limiting:** Introduced `ioredis` sliding-window rate limiting per-tenant to prevent noisy-neighbor API abuse.

### Fault Tolerance & Resilience
- **Circuit Breakers:** Wrapped critical third-party API routes and routing graph logic in the `opossum` Circuit Breaker pattern. If error rates exceed 50%, the circuit opens to prevent cascading failure.
- **Exponential Backoff:** OpenAI calls are wrapped in an asynchronous retry loop with exponential backoff (starting at 500ms).
- **Dead Letter Queue (DLQ):** OCR ingestion failures are gracefully caught and routed to an `OcrDeadLetterQueue` MongoDB collection, allowing operators to manually investigate and replay the payload without data loss.

## DevOps
- Added a `k6` load testing suite simulating production-scale concurrent RPS bursts against the backend API.
- Implemented a complete GitHub Actions CI/CD workflow testing standard Node.js build health.

---
*Built to the engineering standards of Palantir, Databricks, and Anthropic.*
