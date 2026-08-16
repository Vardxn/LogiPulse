import { PrismaClient } from "@prisma/client";
import { TelemetryOpenAI } from "../utils/llmWrapper";
import { RAGService } from "./ragService";

const prisma = new PrismaClient();
const telemetryOpenAI = new TelemetryOpenAI();
const ragService = new RAGService();

export class RAGEvaluationService {
  /**
   * Run regression test against a Golden Dataset.
   * Note: In a true prod scenario, we would iterate over 100s of query/context pairs.
   * This executes the evaluation against a sample set and returns average metrics.
   */
  public async runEvaluation(bolRecordId: string) {
    const goldenQuestions = [
      {
        question: "What is the total invoice amount?",
        expectedAnswer: "The total amount is the grand total of all line items."
      },
      {
        question: "Who is the vendor?",
        expectedAnswer: "The vendor is the company selling the goods."
      }
    ];

    let totalFaithfulness = 0;
    let totalRelevance = 0;
    let totalPrecision = 0;
    let totalRecall = 0;

    for (const test of goldenQuestions) {
      // 1. Retrieve contexts via Hybrid Search
      const results: any[] = await ragService.hybridSearch(test.question, bolRecordId);
      const contexts = results.map(r => r.content).join("\n");

      // 2. Generate Answer
      const response = await telemetryOpenAI.createChatCompletion({
        model: "gpt-4o",
        temperature: 0,
        messages: [
          { role: "system", content: "You are an assistant. Use only the provided context to answer." },
          { role: "user", content: `Context:\n${contexts}\n\nQuestion: ${test.question}` }
        ]
      }, "runEvaluation_answer");
      const answer = response.choices[0].message.content || "";

      // 3. Evaluate Metrics using LLM-as-a-judge (Simplified RAGAS equivalent)
      const evalResponse = await telemetryOpenAI.createChatCompletion({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a RAG evaluator. Evaluate the Answer based on the Question and Context. Return a JSON object with keys: faithfulness, answerRelevance, contextPrecision, contextRecall. Each should be a float between 0.0 and 1.0." },
          { role: "user", content: `Question: ${test.question}\nContext: ${contexts}\nExpected Answer: ${test.expectedAnswer}\nActual Answer: ${answer}` }
        ]
      }, "runEvaluation_judge");

      const metrics = JSON.parse(evalResponse.choices[0].message.content || "{}");
      totalFaithfulness += metrics.faithfulness || 0;
      totalRelevance += metrics.answerRelevance || 0;
      totalPrecision += metrics.contextPrecision || 0;
      totalRecall += metrics.contextRecall || 0;
    }

    const count = goldenQuestions.length;
    const finalMetrics = {
      datasetName: "Golden Dataset V1",
      faithfulness: totalFaithfulness / count,
      answerRelevance: totalRelevance / count,
      contextPrecision: totalPrecision / count,
      contextRecall: totalRecall / count
    };

    // Store evaluation
    const savedEval = await prisma.ragEvaluation.create({
      data: finalMetrics
    });

    return savedEval;
  }
}
