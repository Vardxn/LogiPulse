import mongoose from "mongoose";

export interface IOcrDeadLetterQueue extends mongoose.Document {
  bolRecordId?: string;
  originalFileName?: string;
  errorMessage: string;
  stackTrace?: string;
  createdAt: Date;
  status: 'PENDING' | 'REPLAYED' | 'DISCARDED';
}

const OcrDeadLetterQueueSchema = new mongoose.Schema({
  bolRecordId: { type: String },
  originalFileName: { type: String },
  errorMessage: { type: String, required: true },
  stackTrace: { type: String },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['PENDING', 'REPLAYED', 'DISCARDED'], default: 'PENDING' }
});

export const OcrDeadLetterQueue = mongoose.models.OcrDeadLetterQueue || mongoose.model<IOcrDeadLetterQueue>("OcrDeadLetterQueue", OcrDeadLetterQueueSchema, "ocr_dlq");
