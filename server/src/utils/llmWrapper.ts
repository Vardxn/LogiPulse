import { OpenAI } from "openai";
import { LLMTelemetry } from "../models/llmTelemetry";
import { withRetry } from "./circuitBreaker";

const PRICING = {
  "gpt-4o": { input: 5.0 / 1000000, output: 15.0 / 1000000 },
  "text-embedding-3-small": { input: 0.02 / 1000000, output: 0 }
};

export class TelemetryOpenAI {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY || "dummy-key" });
  }

  public get client() {
    return this.openai;
  }

  public async createChatCompletion(params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, endpoint: string, tenantId?: string) {
    const start = Date.now();
    try {
      const response = await withRetry(() => this.openai.chat.completions.create(params), 3, 500);
      const durationMs = Date.now() - start;
      const usage = response.usage;
      
      if (usage) {
        const model = params.model as keyof typeof PRICING;
        const rates = PRICING[model] || PRICING["gpt-4o"];
        const cost = (usage.prompt_tokens * rates.input) + (usage.completion_tokens * (rates.output || 0));

        await LLMTelemetry.create({
          endpoint,
          model: params.model,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          estimatedCostUsd: cost,
          durationMs,
          tenantId
        });
      }
      return response;
    } catch (error: any) {
      await LLMTelemetry.create({
        endpoint,
        model: params.model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        durationMs: Date.now() - start,
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  public async createEmbedding(params: OpenAI.Embeddings.EmbeddingCreateParams, endpoint: string, tenantId?: string) {
    const start = Date.now();
    try {
      const response = await withRetry(() => this.openai.embeddings.create(params), 3, 500);
      const durationMs = Date.now() - start;
      const usage = response.usage;
      
      if (usage) {
        const model = params.model as keyof typeof PRICING;
        const rates = PRICING[model] || PRICING["text-embedding-3-small"];
        const cost = usage.prompt_tokens * rates.input;

        await LLMTelemetry.create({
          endpoint,
          model: params.model,
          promptTokens: usage.prompt_tokens,
          completionTokens: 0,
          totalTokens: usage.prompt_tokens, // embedding only uses prompt tokens
          estimatedCostUsd: cost,
          durationMs,
          tenantId
        });
      }
      return response;
    } catch (error: any) {
      throw error;
    }
  }
}
