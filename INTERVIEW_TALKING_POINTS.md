# LogiPulse Interview Talking Points

## "Tell me about LogiPulse." (2-Minute Elevator Pitch)
"LogiPulse is an AI-driven supply chain routing and analytics platform I built from scratch to solve the disconnect between unstructured logistics documents—like Bills of Lading—and live fleet routing. The system has two core components: a GPT-4o-powered OCR pipeline that uses a Hybrid Vector Search (RAG) to extract and query structured operational data, and a real-time graph routing engine using Dijkstra/A* to compute the most efficient delivery path based on live weather and congestion metrics. It's built on Node.js and TypeScript, using PostgreSQL with `pgvector` for relational and semantic state, and MongoDB for telemetry. The biggest focus during development was engineering it for production—meaning strict multi-tenant isolation, circuit breakers for resilience, and comprehensive token/cost observability for the LLM calls."

## "What was the hardest technical challenge you faced?"
"The hardest challenge was ensuring the LLM didn't hallucinate metrics or invoice amounts when querying the logistics documents, which is unacceptable in a supply chain context. Standard vector search wasn't enough because invoice numbers require exact keyword matching, not semantic similarity. I solved this by implementing Hybrid Retrieval—using Reciprocal Rank Fusion (RRF) directly in a PostgreSQL CTE to merge `pgvector` cosine similarity with native `tsvector` text search. Furthermore, I engineered the GPT-4o prompt to output a strict JSON Schema demanding exact 'Chunk IDs' as citations. If the LLM generated an answer, I passed it through a separate `/verify-citations` endpoint that cross-referenced the database to confirm the citation actually contained the excerpt. This completely eliminated ungrounded hallucinations."

## "How did you handle failure cases and edge cases?"
"I designed the system around the assumption that third-party APIs (like OpenAI or Weather feeds) will eventually fail. I implemented three layers of resilience:
1. **Exponential Backoff:** All LLM calls are wrapped in a retry loop with exponential backoff to gracefully handle OpenAI rate limits (HTTP 429).
2. **Circuit Breakers:** I used `opossum` to wrap the routing engine and external API calls. If the error threshold crosses 50%, the circuit opens, failing fast and returning a degraded state rather than hanging the entire Express server.
3. **Dead Letter Queue (DLQ):** If the async OCR pipeline fails to parse a chaotic PDF, instead of dropping the data, the payload and stack trace are dumped into a MongoDB DLQ collection. This allows an operations team to manually review, fix, and replay the ingestion job without data loss."

## "How would you scale this to 10,000 users / tenants?"
"To scale LogiPulse for 10,000 tenants, I'd evolve the architecture horizontally and vertically:
1. **Database:** I would implement true Row-Level Security (RLS) directly in PostgreSQL rather than just the Prisma extension, and eventually horizontally shard the Postgres cluster by `tenant_id` so IOPS scale linearly. 
2. **Asynchronous Message Broker:** I would decouple the OCR extraction and embedding pipeline from the synchronous HTTP request cycle using Apache Kafka or RabbitMQ. A fleet of Python or Go worker nodes would consume from the queue, process the PDFs, and update the DB asynchronously.
3. **Caching:** The routing graph compute is expensive. I would hash the `startNode`, `endNode`, and timestamp, and cache the resulting route in Redis. If the underlying weather/congestion metrics haven't shifted significantly (e.g., within a 15-minute window), we serve the route from Redis, cutting API latency from hundreds of milliseconds to 2 milliseconds."
