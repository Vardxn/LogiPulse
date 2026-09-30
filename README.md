# LogiPulse 🚚⚡

**Multi-Modal Logistics Routing Engine & Intelligent Bill-of-Lading (BOL) Audit Platform**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

---

## 📌 Problem & Overview

Global supply chain and logistics operations face two major bottlenecks:
1. **Dynamic Freight Pathfinding:** Standard GPS solutions optimize for single passenger vehicles rather than complex multi-modal freight routes where variable truck tolls, live congestion penalties, and adverse weather conditions heavily impact delivery schedules and shipping margins.
2. **Unstructured Document Processing & Discrepancies:** Bills of Lading (BOLs), invoices, and customs manifests arrive as scanned PDFs and low-resolution images. Manual audit of line items, freight quantities, and vendor tariffs causes invoicing delays and operational errors.

**LogiPulse** solves both problems through a high-performance, multi-tenant platform featuring:
- A standalone **TypeScript Graph Routing Engine** implementing **A\*** (with Haversine heuristics) and **Dijkstra** algorithms with dynamic multi-variable edge weighting.
- A **Dual-Database Architecture** pairing relational transactional data in **PostgreSQL (via Prisma ORM and pgvector)** with real-time transit telemetry in **MongoDB**.
- An **OCR & Hybrid RAG Audit Pipeline** combining **Google Cloud Vision OCR**, OpenAI structured extraction, and hybrid retrieval (**Reciprocal Rank Fusion** combining dense `pgvector` embeddings and PostgreSQL BM25 full-text search) with automated citation verification.
- Enterprise resilience patterns including **Circuit Breakers (`opossum`)**, **Redis rate limiting (`ioredis`)**, **Prometheus metrics (`prom-client`)**, and a **Dead Letter Queue (DLQ)** for failed document extraction jobs.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client ["Frontend Layer (Next.js 14)"]
        UI["Web Dashboard & Visualizer"]
        Map["RouteVisualizer (Dynamic Pathing)"]
        BOL["BolAuditWorkspace (OCR Inspector)"]
    end

    subgraph Gateway ["API & Middleware Layer (Express / TypeScript)"]
        AUTH["JWT & RBAC Middleware"]
        RATE["Redis Token-Bucket Rate Limiter"]
        CB["Circuit Breakers (Opossum)"]
        PROM["Prometheus Metrics (/metrics)"]
    end

    subgraph Core ["Core Processing Services"]
        RE["Routing Engine (A* / Dijkstra Graph)"]
        OCR["OCR Pipeline (Google Cloud Vision)"]
        RAG["Hybrid RAG Service (RRF + Citations)"]
        EVAL["LLM-as-a-Judge Eval Harness"]
    end

    subgraph Storage ["Dual-Database Storage"]
        PG[("PostgreSQL (Prisma + pgvector)\n- Orders & Warehouses\n- Vector Chunks\n- Tenants & Users")]
        MONGO[("MongoDB (Mongoose)\n- Transit Telemetry\n- LLM Cost Tracking\n- OCR Dead Letter Queue")]
        REDIS[("Redis Cache / Limiter")]
    end

    UI --> AUTH
    AUTH --> RATE
    RATE --> CB
    CB --> RE
    CB --> OCR
    CB --> RAG

    RE --> PG
    OCR --> MONGO
    RAG --> PG
    EVAL --> PG
    PROM --> Gateway
    RATE --> REDIS
```

---

## 🚀 Key Modules & Technical Implementation

### 1. Standalone Graph Routing Engine (`routing-engine/`)
The routing engine is structured as an isolated TypeScript module designed for sub-millisecond route optimization:
- **Algorithms:**
  - **A\* Search (`astar.ts`):** Evaluates nodes using $f(n) = g(n) + h(n)$, where $h(n)$ is the great-circle **Haversine distance** calculated between geographic coordinates $(\text{lat}_1, \text{lon}_1)$ and $(\text{lat}_2, \text{lon}_2)$.
  - **Dijkstra Search (`dijkstra.ts`):** Computes definitive shortest paths using priority-queue traversal when heuristic targets are flexible.
- **Dynamic Multi-Variable Weight Calculator (`weightCalculator.ts`):**
  $$\text{Effective Weight} = \text{Base Distance} \times (1 + \text{Congestion Factor}) + \text{Toll Penalty} + \text{Weather Factor}$$
  Dynamically penalizes high-risk corridors based on live traffic, toll tariffs, and hazardous weather conditions.

### 2. Multi-Tenant Data Layer & Dual Database Architecture
- **PostgreSQL via Prisma ORM (`server/prisma/schema.prisma`):**
  - Handles relational schemas: `Tenant`, `User`, `Warehouse`, `Vendor`, `Order`, `OrderItem`, `ShipmentRoute`, and `BillOfLadingRecord`.
  - Supports vector embeddings natively using the PostgreSQL `pgvector` extension (`vector(1536)`).
- **MongoDB via Mongoose (`server/src/models/`):**
  - Ingests high-throughput timeseries telemetry: `TransitTelemetry` (GPS coords, speed, fuel), `LLMTelemetry` (token usage, latency, live USD cost per query), and `OcrDeadLetterQueue` (failed document jobs for replay).

### 3. Document Extraction & Hybrid RAG Audit Pipeline
- **OCR Processing:** Scanned shipping manifests and BOL PDFs are ingested via Google Cloud Vision API, normalized into structured JSON with vendor line-items, and validated with Zod schemas.
- **Hybrid RAG (Dense + Sparse Search):** Document chunks are embedded with `text-embedding-3-small`. Queries run a **Reciprocal Rank Fusion (RRF)** query combining vector cosine distance with PostgreSQL Full-Text Search (tsvector BM25):
  $$\text{RRF Score} = \frac{1 - \alpha}{60 + \text{rank}_{\text{vector}}} + \frac{\alpha}{60 + \text{rank}_{\text{text}}}$$
- **Anti-Hallucination Citation Enforcement:** Output prompts require strict JSON Schema citation bindings. The server cross-verifies returned chunk IDs directly against PostgreSQL chunk records before responding.
- **LLM-as-a-Judge Evaluation:** Includes an automated evaluation service (`ragEvaluationService.ts`) measuring Faithfulness, Answer Relevance, and Context Precision against a golden dataset.

### 4. Reliability, Observability & Resilience
- **Circuit Breakers (`opossum`):** Wraps external OpenAI and Google Vision calls with a 10s timeout, 50% error threshold, and 30s reset window with fail-soft fallbacks.
- **Redis Rate Limiting (`ioredis`):** Sliding-window per-tenant request limits to prevent noisy-neighbor API starvation.
- **Prometheus Metrics (`prom-client`):** Exposes histograms for `ocr_pipeline_latency_seconds`, `rag_query_latency_seconds`, and `routing_engine_latency_seconds` on `/metrics`.
- **Dead Letter Queue:** Failed OCR jobs automatically save payload and stack traces to MongoDB for human-in-the-loop review.

---

## 📂 Repository Layout

```
logipulse-routing/
├── routing-engine/                # Standalone TypeScript Graph Algorithm Package
│   ├── src/
│   │   ├── astar.ts               # A* pathfinding with Haversine heuristic
│   │   ├── dijkstra.ts            # Dijkstra shortest-path algorithm
│   │   ├── geoUtils.ts            # Geographic Haversine distance utilities
│   │   ├── Graph.ts               # Adjacency list graph with dynamic weighting
│   │   ├── weightCalculator.ts    # Congestion, toll, and weather penalties
│   │   └── routing.test.ts        # Unit test suite for routing algorithms
│   └── package.json
├── server/                        # Express / TypeScript Backend API
│   ├── prisma/
│   │   ├── schema.prisma          # PostgreSQL relational & pgvector schema
│   │   └── seed.ts                # Warehouse and order seeding script
│   └── src/
│       ├── controllers/           # Auth, BOL, Inventory, Routing, Tracking, RAG
│       ├── middleware/            # Auth JWT, Tenant Rate Limiting, Error Handlers
│       ├── models/                # MongoDB Mongoose models (Telemetry, DLQ)
│       ├── routes/                # Express REST routes
│       ├── services/              # Routing, BOL Extraction, OCR, RAG, RAG Eval
│       ├── utils/                 # CircuitBreaker, Metrics, LLM Telemetry Wrapper
│       └── tests/                 # Auth & BOL extraction unit tests
├── client/                        # Next.js 14 App Router Frontend
│   └── src/components/
│       ├── BolAuditWorkspace.tsx  # Document OCR inspection & verification UI
│       └── RouteVisualizer.tsx    # Interactive map routing visualizer
├── .github/workflows/ci.yml       # GitHub Actions automated CI workflow
├── docker-compose.yml             # Orchestration for Postgres, Mongo, Redis & App
└── README.md
```

---

## ⚙️ Local Development & Setup

### Prerequisites
- Node.js 18+ or 20+
- Docker & Docker Compose
- PostgreSQL (with pgvector) & MongoDB (or use Docker Compose)

### 1. Clone & Configure Environment
```bash
git clone https://github.com/Vardxn/LogiPulse.git
cd LogiPulse
cp .env.example .env
```

Ensure your `.env` contains:
```ini
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/logipulse?schema=public
MONGODB_URI=mongodb://localhost:27017/logipulse
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key
OPENAI_API_KEY=your_openai_api_key
```

### 2. Start Infrastructure with Docker Compose
```bash
docker-compose up -d postgres mongodb redis
```

### 3. Build & Run Services

**Install dependencies & build routing engine:**
```bash
cd routing-engine
npm install
npm run build
```

**Run database migrations and start server:**
```bash
cd ../server
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

**Start Next.js frontend:**
```bash
cd ../client
npm install
npm run dev
```

---

## 🧪 Testing & Verification

Run the comprehensive unit and integration test suites:

```bash
# 1. Run Graph Routing Engine Tests (A*, Dijkstra, Haversine, Weight Calculator)
cd routing-engine
npx jest

# 2. Run Backend Server Tests (Auth, BOL Extraction, Security)
cd ../server
npm test

# 3. Typecheck all workspaces
npm run build  # in routing-engine
npx tsc --noEmit  # in server
npx tsc --noEmit  # in client
```

---

## 🛡️ Security & Tenant Isolation

- **Role-Based Access Control (RBAC):** Restricts endpoints across `WAREHOUSE_OPERATOR`, `LOGISTICS_PARTNER`, and `ADMIN`.
- **Tenant Data Isolation:** Multi-tenant scoping enforced at both the API controller and database layer.
- **Fail-Safe Circuit Breaker:** Gracefully fails open or routes to cached fallbacks when third-party AI or vision APIs experience outages.
- **Secrets Management:** Zero committed production secrets; all external services configured via environment variables.
