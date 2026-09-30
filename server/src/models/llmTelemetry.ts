import mongoose from "mongoose";

export interface ILLMTelemetry extends Omit<mongoose.Document, "model"> {
  endpoint: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  durationMs: number;
  timestamp: Date;
  tenantId?: string;
  error?: string;
}

const LLMTelemetrySchema = new mongoose.Schema({
  endpoint: { type: String, required: true },
  model: { type: String, required: true },
  promptTokens: { type: Number, required: true },
  completionTokens: { type: Number, required: true },
  totalTokens: { type: Number, required: true },
  estimatedCostUsd: { type: Number, required: true },
  durationMs: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  tenantId: { type: String },
  error: { type: String }
});

export const LLMTelemetry = mongoose.models.LLMTelemetry || mongoose.model<ILLMTelemetry>("LLMTelemetry", LLMTelemetrySchema, "llm_telemetry");
