import { ImageAnnotatorClient } from '@google-cloud/vision';

export class OcrService {
  private client: ImageAnnotatorClient | null = null;

  constructor() {
    // If GOOGLE_VISION_KEY is present in environment, initialize client
    // Otherwise it will fall back to default ADC credentials or fail gracefully
    if (process.env.GOOGLE_VISION_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        this.client = new ImageAnnotatorClient();
      } catch (err) {
        console.error('Failed to initialize Google Cloud Vision client:', err);
      }
    }
  }

  /**
   * Extract raw text from document URL or local path
   */
  public async extractText(fileUrl: string): Promise<string> {
    if (!this.client) {
      throw new Error('Google Cloud Vision client is not configured. Missing credentials in env.');
    }

    try {
      const [result] = await this.client.textDetection(fileUrl);
      const text = result.fullTextAnnotation?.text;
      
      if (!text) {
        throw new Error('No text detected in the document.');
      }
      
      return text;
    } catch (error: any) {
      console.error('[OCR Error]:', error.message);
      throw new Error(`OCR Processing Failed: ${error.message}`);
    }
  }
}
