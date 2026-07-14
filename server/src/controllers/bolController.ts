import { Request, Response } from 'express';
import { BolService } from '../services/bolService';

const bolService = new BolService();

export async function handleIngestBillOfLading(req: Request, res: Response): Promise<void> {
  try {
    const { orderId, rawFileUrl } = req.body;

    if (!rawFileUrl) {
      res.status(400).json({ error: 'Missing mandatory parameter: rawFileUrl is required.' });
      return;
    }

    const record = await bolService.ingestBillOfLading(orderId || null, rawFileUrl);

    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error: any) {
    console.error('[BOL Controller Error]:', error.message);
    res.status(500).json({ error: 'Internal ingestion pipeline error: ' + error.message });
  }
}
