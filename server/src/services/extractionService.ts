import { OpenAI } from "openai";
import { GoogleCloudVisionAPI } from "../utils/visionApi";

export interface ExtractedBolData {
  vendorName?: string;
  invoiceNumber?: string;
  items?: Array<{
    sku?: string;
    description?: string;
    quantity?: number;
    unitPrice?: number;
    tariffCode?: string;
  }>;
  grandTotal?: number;
  shipmentDate?: string;
  error?: string;
}

export class ExtractionService {
  private openai: OpenAI;
  private visionApi: GoogleCloudVisionAPI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "dummy-key" });
    this.visionApi = new GoogleCloudVisionAPI();
  }

  public async extractDocumentData(fileBuffer: Buffer): Promise<ExtractedBolData> {
    try {
      // 1. Perform foundational text layout parsing using Google Cloud Vision API
      const rawOcrText = await this.visionApi.extractRawText(fileBuffer);
      if (!rawOcrText || rawOcrText.trim().length === 0) {
        return { error: "OCR Pipeline breakdown: Zero textual characters recovered from the payload image." };
      }

      // 2. Structured output extraction via GPT-4o using a strict JSON Schema format (derived from healtease)
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "bill_of_lading_extraction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                vendorName: { type: ["string", "null"] },
                invoiceNumber: { type: ["string", "null"] },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      sku: { type: ["string", "null"] },
                      description: { type: ["string", "null"] },
                      quantity: { type: ["number", "null"] },
                      unitPrice: { type: ["number", "null"] },
                      tariffCode: { type: ["string", "null"] }
                    },
                    required: ["sku", "description", "quantity", "unitPrice", "tariffCode"],
                    additionalProperties: false
                  }
                },
                grandTotal: { type: ["number", "null"] },
                shipmentDate: { type: ["string", "null"] }
              },
              required: ["vendorName", "invoiceNumber", "items", "grandTotal", "shipmentDate"],
              additionalProperties: false
            }
          }
        },
        messages: [
          {
            role: "system",
            content: "You are an enterprise logistics parsing engine. Extract structural operational parameters from the raw noisy OCR text text dump."
          },
          {
            role: "user",
            content: `Raw OCR document input stream to normalize:\n\n${rawOcrText}`
          }
        ]
      });

      const parsedResponse: ExtractedBolData = JSON.parse(response.choices[0].message.content || "{}");
      return parsedResponse;
    } catch (err: any) {
      console.error("[Extraction Pipeline Failure]:", err.message);
      return { error: "Failed to cleanly orchestrate document AI ingestion steps: " + err.message };
    }
  }
}
