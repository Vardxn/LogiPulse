<div align="center">

# 🚚 LogiPulse

**AI-Driven Multi-Modal Supply Chain Routing Engine**

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![OpenAI](https://img.shields.io/badge/GPT--4o-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)

</div>

---

## The Problem

Modern supply chain logistics rely heavily on static routing models. Traditional systems fail to account for dynamic, real-world variables such as severe weather changes, sudden traffic congestion, and fluctuating fuel costs. Furthermore, processing shipping manifests is a notoriously manual and error-prone process, requiring human data entry that slows down the entire pipeline and introduces costly data corruption.

## The Solution (LogiPulse)

**LogiPulse** is an AI-powered logistics operating system designed to dynamically optimize supply chain routing and automate manifest extraction.

To solve the routing bottleneck, LogiPulse implements custom Dijkstra and A* graph-routing algorithms over a 500+ node network, continuously ingesting live weather and fuel APIs to recalculate the most cost-effective and time-efficient paths in real-time. 

To solve the manual data-entry problem, LogiPulse introduces a GPT-4o powered OCR and RAG pipeline. It instantly scans uploaded structured manifests, extracts the payload data, and automatically formats it for the routing engine, eliminating human error entirely.

---

## 🌟 Key Features

*   **Dynamic Graph Routing:** Custom Dijkstra/A* implementations scaling across 500+ nodes.
*   **Live API Integration:** Real-time path cost adjustments based on weather and fuel pricing.
*   **AI Manifest OCR:** GPT-4o integration to parse complex PDF and image manifests accurately.
*   **Polyglot Persistence:** PostgreSQL for relational routing data and MongoDB for unstructured manifest storage.
*   **Full-Stack Next.js:** High-performance, server-rendered logistics dashboard.

---

## 💻 Tech Stack

*   **Frontend:** Next.js, React, Tailwind CSS
*   **Backend:** Node.js, TypeScript, Prisma ORM
*   **Databases:** PostgreSQL (Routing data), MongoDB (Manifest logs)
*   **AI / Integrations:** OpenAI GPT-4o, Weather API, Maps API
*   **DevOps:** Docker, Docker Compose

---

## 🚀 Getting Started

### Local Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Vardxn/LogiPulse.git
   cd LogiPulse
   ```

2. **Install dependencies (Monorepo):**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create `.env` files in the respective directories containing:
   ```env
   DATABASE_URL="postgresql://user:pass@localhost:5432/logipulse"
   MONGO_URI="mongodb://localhost:27017/logipulse"
   OPENAI_API_KEY="sk-..."
   ```

4. **Run via Docker Compose:**
   ```bash
   docker-compose up -d --build
   ```

5. **Start the Development Servers:**
   ```bash
   npm run dev
   ```

---

## 👨‍💻 Author

**Vardan Pal**

* **LinkedIn:** [linkedin.com/in/vardxn](https://linkedin.com/in/vardxn)
* **GitHub:** [@vardxn](https://github.com/vardxn)
* **Portfolio:** [vardxn.vercel.app](https://vardxn.vercel.app)
