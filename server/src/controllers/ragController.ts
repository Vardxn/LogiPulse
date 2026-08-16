import { Request, Response } from "express";
import { RAGEvaluationService } from "../services/ragEvaluationService";
import { RAGService } from "../services/ragService";

const ragEvalService = new RAGEvaluationService();
const ragService = new RAGService();

export const runRagEvaluation = async (req: Request, res: Response) => {
  try {
    const { bolRecordId } = req.body;
    if (!bolRecordId) {
      return res.status(400).json({ error: "bolRecordId is required for evaluation." });
    }

    const evaluationResult = await ragEvalService.runEvaluation(bolRecordId);
    res.status(200).json(evaluationResult);
  } catch (err: any) {
    console.error("[RAG Evaluation Error]:", err.message);
    res.status(500).json({ error: "Failed to run RAG evaluation." });
  }
};

export const askQuestion = async (req: Request, res: Response) => {
  try {
    const { bolRecordId, query } = req.body;
    if (!bolRecordId || !query) {
      return res.status(400).json({ error: "bolRecordId and query are required." });
    }

    const result = await ragService.askQuestion(query, bolRecordId);
    res.status(200).json(result);
  } catch (err: any) {
    console.error("[Q&A Error]:", err.message);
    res.status(500).json({ error: "Failed to process question." });
  }
};

export const verifyCitations = async (req: Request, res: Response) => {
  try {
    const { citations } = req.body;
    if (!citations || !Array.isArray(citations)) {
      return res.status(400).json({ error: "A citations array is required." });
    }

    const result = await ragService.verifyCitations(citations);
    res.status(200).json({ verifiedCitations: result });
  } catch (err: any) {
    console.error("[Verify Citations Error]:", err.message);
    res.status(500).json({ error: "Failed to verify citations." });
  }
};
