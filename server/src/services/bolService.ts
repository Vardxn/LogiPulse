import { PrismaClient, ExtractionConfidence } from "@prisma/client";
import { ExtractedBolData } from "./extractionService";

const prisma = new PrismaClient();

export interface ConfidenceResult {
  score: number;
  status: ExtractionConfidence;
  breakdown: { balanceScore: number; skuScore: number; regexScore: number };
  unknownSkus: string[];
}

export class BolService {
  
  public async evaluateConfidence(data: ExtractedBolData): Promise<ConfidenceResult> {
    const items = data.items ?? [];

    // --- Layer A: Mathematical Balance Check (Weight: 40%) ---
    let balanceScore = 0;
    if (data.grandTotal && items.length > 0) {
      const computedTotal = items.reduce((sum, item) => sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0)), 0);
      const percentDiff = Math.abs(computedTotal - data.grandTotal) / data.grandTotal;
      
      if (percentDiff <= 0.02) {
        balanceScore = 0.4; // Within full structural tolerance boundaries
      } else if (percentDiff <= 0.10) {
        // Scaled linear penalty interpolation framework between 2% and 10% variance thresholds
        balanceScore = 0.4 * (1 - (percentDiff - 0.02) / 0.08);
      } else {
        balanceScore = 0;
      }
    }

    // --- Layer B: SKU System Cross-Reference (Weight: 30%) ---
    let skuScore = 0;
    const unknownSkus: string[] = [];
    if (items.length > 0) {
      const knownSkuRows = await prisma.inventoryItem.findMany({ select: { sku: true } });
      const knownSkus = new Set(knownSkuRows.map(r => r.sku));
      
      const itemsWithSku = items.filter(i => i.sku);
      let matchCount = 0;
      
      itemsWithSku.forEach(item => {
        if (knownSkus.has(item.sku!)) {
          matchCount++;
        } else {
          unknownSkus.push(item.sku!);
        }
      });
      
      skuScore = itemsWithSku.length > 0 ? 0.3 * (matchCount / itemsWithSku.length) : 0;
    }

    // --- Layer C: Regex Format Integrity Pattern Verification (Weight: 30%) ---
    let fieldsChecked = 0;
    let fieldsPassed = 0;
    const tariffPattern = /^\d{6,10}$/; // Standard global tariff format matching criteria
    const invoicePattern = /^[A-Za-z0-9-]{3,}$/;

    items.forEach(item => {
      if (item.tariffCode !== undefined && item.tariffCode !== null) {
        fieldsChecked++;
        if (tariffPattern.test(item.tariffCode)) fieldsPassed++;
      }
    });

    if (data.invoiceNumber !== undefined && data.invoiceNumber !== null) {
      fieldsChecked++;
      if (invoicePattern.test(data.invoiceNumber)) fieldsPassed++;
    }

    const regexScore = fieldsChecked > 0 ? 0.3 * (fieldsPassed / fieldsChecked) : 0;

    // --- Total Aggregate Processing & State Assignments ---
    const score = balanceScore + skuScore + regexScore;
    let status: ExtractionConfidence;
    
    if (score >= 0.85) status = ExtractionConfidence.HIGH;
    else if (score >= 0.60) status = ExtractionConfidence.MEDIUM;
    else status = ExtractionConfidence.LOW;

    return { score, status, breakdown: { balanceScore, skuScore, regexScore }, unknownSkus };
  }

  public async ingestBillOfLading(rawData: ExtractedBolData, requestedOrderId: string | null) {
    // Run evaluation scoring gate logic asynchronously
    const confidenceResult = await this.evaluateConfidence(rawData);

    // HUMAN-IN-THE-LOOP CONSTRAINT: Force decoupling from active orders if evaluation signals vulnerability
    let linkedOrderId = requestedOrderId;
    if (confidenceResult.status === ExtractionConfidence.MEDIUM || confidenceResult.status === ExtractionConfidence.LOW) {
      console.warn(`[Pipeline Ingestion Warning] Downgrading auto-link actions. Score ${confidenceResult.score.toFixed(2)} status flagged ${confidenceResult.status}. Unlinking Order Reference.`);
      linkedOrderId = null;
    }

    // Append calculation metadata variables straight into storage records JSON objects for analytical audit tracing
    const enrichedJsonPayload = {
      ...rawData,
      _confidenceMeta: {
        score: confidenceResult.score,
        breakdown: confidenceResult.breakdown,
        unknownSkus: confidenceResult.unknownSkus
      }
    };

    const savedRecord = await prisma.billOfLadingRecord.create({
      data: {
        invoiceNumber: rawData.invoiceNumber || `UNREADABLE-${Date.now()}`,
        vendorName: rawData.vendorName || "UNKNOWN_VENDOR",
        extractedJson: enrichedJsonPayload,
        confidence: confidenceResult.status,
        reviewedByHuman: false,
        orderId: linkedOrderId,
        rawFileUrl: (rawData as any).rawFileUrl || "http://placeholder-url.com/file.pdf"
      }
    });

    return savedRecord;
  }
}
