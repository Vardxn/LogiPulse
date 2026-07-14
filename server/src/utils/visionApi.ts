import { ImageAnnotatorClient } from '@google-cloud/vision';

export class GoogleCloudVisionAPI {
  private client: ImageAnnotatorClient | null = null;

  constructor() {
    if (process.env.GOOGLE_VISION_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        this.client = new ImageAnnotatorClient();
      } catch (err) {
        console.error('Failed to initialize Google Cloud Vision client:', err);
      }
    }
  }

  public async extractRawText(fileBuffer: Buffer): Promise<string> {
    if (!this.client) {
      throw new Error('Google Cloud Vision client is not configured.');
    }

    try {
      const [result] = await this.client.textDetection(fileBuffer);
      const text = result.fullTextAnnotation?.text;
      return text || '';
    } catch (error: any) {
      console.error('[OCR Utility Error]:', error.message);
      throw error;
    }
  }
}
