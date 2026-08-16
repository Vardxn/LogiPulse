# LogiPulse Resume Bullets

Copy and paste these directly into the experience section of your resume.

- **Architected a Multi-Tenant Supply Chain AI Engine:** Designed a Node.js/TypeScript and PostgreSQL microservice architecture scaling Dijkstra/A* routing alongside GPT-4o document processing, handling concurrent logistics queries.
- **Engineered Hybrid RAG Retrieval:** Implemented Reciprocal Rank Fusion (RRF) combining PostgreSQL `pgvector` semantic search with native Full-Text Search (BM25), eliminating LLM hallucinations via automated citation verification.
- **Built LLM Telemetry & Observability:** Developed a custom OpenAI API interceptor tracking token usage, latency percentiles (p50/p95/p99), and live USD cost projections, exposing timeseries data to Prometheus via `/metrics`.
- **Enforced Tenant Data Isolation:** Wrote a custom Prisma Client Extension middleware to systematically inject Row-Level Security (RLS) predicates on all database transactions, guaranteeing cross-tenant data boundaries.
- **Designed Resilient Microservice Patterns:** Fortified the API using Circuit Breakers (`opossum`), exponential backoff retries for LLM rate limits, and a MongoDB-backed Dead Letter Queue (DLQ) for asynchronous OCR job failures.
- **Implemented Automated LLM-as-a-Judge Evals:** Constructed a custom RAG evaluation pipeline scoring Answer Relevance and Context Precision against a golden dataset to track model drift across iterative deployments.
