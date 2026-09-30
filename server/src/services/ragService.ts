import { PrismaClient } from "@prisma/client";
import { TelemetryOpenAI } from "../utils/llmWrapper";
import { ragQueryLatency } from "../utils/metrics";

const prisma = new PrismaClient();
const telemetryOpenAI = new TelemetryOpenAI();

export class RAGService {
  /**
   * Chunks text and generates vector embeddings for each chunk, storing them in PostgreSQL.
   */
  public async processAndStoreDocument(bolRecordId: string, rawText: string) {
    // 1. Basic Chunking Strategy (split by double newlines or large paragraphs)
    const chunks = rawText.split(/\n\n+/).map(c => c.trim()).filter(c => c.length > 50);

    for (const chunk of chunks) {
      // 2. Generate Embedding
      const embeddingResponse = await telemetryOpenAI.createEmbedding({
        model: "text-embedding-3-small",
        input: chunk,
      }, "processAndStoreDocument");
      
      const embedding = embeddingResponse.data[0].embedding;
      const embeddingVector = `[${embedding.join(",")}]`;

      // 3. Store via Prisma (using raw SQL for pgvector Unsupported type insertion)
      await prisma.$executeRaw`
        INSERT INTO "DocumentChunk" ("id", "bolRecordId", "content", "embedding", "createdAt")
        VALUES (gen_random_uuid(), ${bolRecordId}::uuid, ${chunk}, ${embeddingVector}::vector, NOW())
      `;
    }
    
    return chunks.length;
  }

  /**
   * Hybrid Search: Reciprocal Rank Fusion (RRF) combining Vector Search + Full Text Search (BM25 equivalent)
   */
  public async hybridSearch(query: string, bolRecordId: string, alpha: number = 0.5, topK: number = 5) {
    // Generate query embedding
    const embeddingResponse = await telemetryOpenAI.createEmbedding({
        model: "text-embedding-3-small",
        input: query,
      }, "hybridSearch");
    const queryEmbedding = embeddingResponse.data[0].embedding;
    const queryVector = `[${queryEmbedding.join(",")}]`;

    // Perform RRF via PostgreSQL CTEs
    // Note: This assumes english text search configuration
    const results = await prisma.$queryRaw`
      WITH vector_search AS (
        SELECT id, content,
               RANK() OVER (ORDER BY embedding <-> ${queryVector}::vector) as vector_rank
        FROM "DocumentChunk"
        WHERE "bolRecordId" = ${bolRecordId}::uuid
        ORDER BY embedding <-> ${queryVector}::vector
        LIMIT 20
      ),
      text_search AS (
        SELECT id, content,
               RANK() OVER (ORDER BY ts_rank_cd(to_tsvector('english', content), plainto_tsquery('english', ${query}))) as text_rank
        FROM "DocumentChunk"
        WHERE "bolRecordId" = ${bolRecordId}::uuid
          AND to_tsvector('english', content) @@ plainto_tsquery('english', ${query})
        ORDER BY ts_rank_cd(to_tsvector('english', content), plainto_tsquery('english', ${query})) DESC
        LIMIT 20
      )
      SELECT
        COALESCE(v.id, t.id) as id,
        COALESCE(v.content, t.content) as content,
        COALESCE(1.0 / (60 + v.vector_rank), 0.0) * ${1 - alpha} + 
        COALESCE(1.0 / (60 + t.text_rank), 0.0) * ${alpha} as rrf_score
      FROM vector_search v
      FULL OUTER JOIN text_search t ON v.id = t.id
      ORDER BY rrf_score DESC
      LIMIT ${topK};
    `;

    return results;
  }

  /**
   * Q&A with Strict Citation Enforcement using OpenAI Structured Outputs
   */
  public async askQuestion(query: string, bolRecordId: string) {
    const end = ragQueryLatency.startTimer();
    try {
      const searchResults = (await this.hybridSearch(query, bolRecordId, 0.5, 5)) as any[];
      
      // Provide contexts with explicit IDs for citation
      const contextBlocks = searchResults.map((r, idx) => `[ChunkID: ${r.id}]\n${r.content}`).join("\n\n---\n\n");

      const response = await telemetryOpenAI.createChatCompletion({
        model: "gpt-4o",
        temperature: 0,
        response_format: {
        type: "json_schema",
        json_schema: {
          name: "qa_with_citations",
          strict: true,
          schema: {
            type: "object",
            properties: {
              answer: { type: "string", description: "The answer to the query. If you cannot answer, say 'I cannot verify this from the provided documents'." },
              citations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    chunkId: { type: "string" },
                    excerpt: { type: "string", description: "The exact sentence used as evidence" }
                  },
                  required: ["chunkId", "excerpt"],
                  additionalProperties: false
                }
              }
            },
            required: ["answer", "citations"],
            additionalProperties: false
          }
        }
      },
      messages: [
        { role: "system", content: "You are an AI assistant for a Supply Chain Routing platform. Answer the user's question based strictly on the provided context. You MUST cite the ChunkID used. If the context does not contain the answer, say 'I cannot verify this from the provided documents'." },
        { role: "user", content: `Context:\n${contextBlocks}\n\nQuestion: ${query}` }
      ]
    }, "askQuestion");

    end();
    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (e) {
    end();
    throw e;
  }
}

  /**
   * Verify Citations Endpoint Logic
   */
  public async verifyCitations(citations: { chunkId: string; excerpt: string }[]) {
    const verified = [];
    for (const cite of citations) {
      // Validate that chunkId exists and actually contains the excerpt (using basic string inclusion or pg text search)
      const chunkResult: any[] = await prisma.$queryRaw`
        SELECT id, content FROM "DocumentChunk" WHERE id = ${cite.chunkId}::uuid
      `;
      if (chunkResult.length > 0) {
        const text = chunkResult[0].content as string;
        // Basic fuzzy match / inclusion
        const isValid = text.toLowerCase().includes(cite.excerpt.toLowerCase().trim().substring(0, 20)); // match first 20 chars
        verified.push({ ...cite, verified: isValid });
      } else {
        verified.push({ ...cite, verified: false });
      }
    }
    return verified;
  }
}
