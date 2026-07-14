import { BolService } from "../services/bolService";
import { PrismaClient, ExtractionConfidence } from "@prisma/client";
import { ExtractedBolData } from "../services/extractionService";

jest.mock("@prisma/client", () => {
  const mPrisma = {
    inventoryItem: {
      findMany: jest.fn()
    },
    billOfLadingRecord: {
      create: jest.fn()
    }
  };
  return { 
    PrismaClient: jest.fn(() => mPrisma),
    ExtractionConfidence: {
      HIGH: "HIGH",
      MEDIUM: "MEDIUM",
      LOW: "LOW",
      FAILED: "FAILED"
    }
  };
});

const prisma = new PrismaClient();

describe("Bill of Lading Validation Engine Tests", () => {
  let bolService: BolService;

  beforeEach(() => {
    bolService = new BolService();
    jest.clearAllMocks();
  });

  test("HIGH Confidence Evaluation Path: Should score perfectly given mathematically balanced totals, verified database SKUs, and valid regex configurations", async () => {
    (prisma.inventoryItem.findMany as jest.Mock).mockResolvedValue([{ sku: "SKU-99" }, { sku: "SKU-100" }]);
    
    const perfectData: ExtractedBolData = {
      invoiceNumber: "INV-2026-X",
      vendorName: "Nexus Freight",
      grandTotal: 300,
      items: [
        { sku: "SKU-99", quantity: 2, unitPrice: 50, tariffCode: "85171200" },
        { sku: "SKU-100", quantity: 2, unitPrice: 100, tariffCode: "84713010" }
      ]
    };

    const result = await bolService.evaluateConfidence(perfectData);
    expect(result.status).toBe(ExtractionConfidence.HIGH);
    expect(result.score).toBeCloseTo(1.0, 2);
    expect(result.unknownSkus.length).toBe(0);
  });

  test("Mathematical Balance Boundary Threshold Evaluation: 1.5% off must achieve full balance credit, while a 15% discrepancy drops score completely to zero", async () => {
    (prisma.inventoryItem.findMany as jest.Mock).mockResolvedValue([{ sku: "SKU-1" }]);

    const smallDiscrepancyData: ExtractedBolData = {
      invoiceNumber: "INV-OK",
      grandTotal: 100, 
      items: [{ sku: "SKU-1", quantity: 1, unitPrice: 98.5, tariffCode: "85171200" }] // 1.5% delta
    };
    const resultFull = await bolService.evaluateConfidence(smallDiscrepancyData);
    expect(resultFull.breakdown.balanceScore).toBe(0.4);

    const heavyDiscrepancyData: ExtractedBolData = {
      invoiceNumber: "INV-BAD",
      grandTotal: 100,
      items: [{ sku: "SKU-1", quantity: 1, unitPrice: 85, tariffCode: "85171200" }] // 15% delta
    };
    const resultZero = await bolService.evaluateConfidence(heavyDiscrepancyData);
    expect(resultZero.breakdown.balanceScore).toBe(0);
  });

  test("Database SKU Verification Penalty Strategy: Unknown inventory identifiers should lower SKU scores proportionally without executing global validation drops", async () => {
    // Mix of 1 known and 1 unknown item string patterns
    (prisma.inventoryItem.findMany as jest.Mock).mockResolvedValue([{ sku: "SKU-VALID" }]);

    const mixedSkuData: ExtractedBolData = {
      invoiceNumber: "INV-SKU-TEST",
      grandTotal: 200,
      items: [
        { sku: "SKU-VALID", quantity: 1, unitPrice: 100, tariffCode: "85171200" },
        { sku: "SKU-UNSEEDED", quantity: 1, unitPrice: 100, tariffCode: "85171200" }
      ]
    };

    const result = await bolService.evaluateConfidence(mixedSkuData);
    expect(result.unknownSkus).toContain("SKU-UNSEEDED");
    expect(result.breakdown.skuScore).toBeCloseTo(0.15, 2); // exactly half of maximum 0.3 allocation
  });

  test("Regex Pattern Isolation Validation: Single invalid tariff code identifier sequence dynamically dampens regex score values fractionally", async () => {
    (prisma.inventoryItem.findMany as jest.Mock).mockResolvedValue([{ sku: "SKU-1" }]);

    const corruptedRegexData: ExtractedBolData = {
      invoiceNumber: "INV-123", // Valid
      grandTotal: 100,
      items: [
        { sku: "SKU-1", quantity: 1, unitPrice: 100, tariffCode: "85171200" }, // Valid tariff
        { sku: "SKU-1", quantity: 0, unitPrice: 0, tariffCode: "BAD-CHARACTERS" } // Corrupted alpha tariff string
      ]
    };

    const result = await bolService.evaluateConfidence(corruptedRegexData);
    // 3 fields checked (1 invoice, 2 tariffs). 2 fields passed. Score = 0.3 * (2/3)
    expect(result.breakdown.regexScore).toBeCloseTo(0.2, 2);
  });
});
