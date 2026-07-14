import { Schema, model, Document } from 'mongoose';

export interface ITransitTelemetry extends Document {
  orderId: string;
  timestamp: Date;
  location: {
    lat: number;
    lng: number;
  };
  transportMode: 'SEA' | 'RAIL' | 'ROAD';
  speedKmh?: number;
  eventType: 'DEPARTED' | 'IN_TRANSIT' | 'PORT_ARRIVAL' | 'CUSTOMS_HOLD' | 'DELIVERED';
  metadata?: {
    vesselId?: string;
    temperature?: number;
    notes?: string;
    [key: string]: any; // Allow flexibility with other metadata fields
  };
}

const TransitTelemetrySchema = new Schema<ITransitTelemetry>(
  {
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    transportMode: {
      type: String,
      enum: ['SEA', 'RAIL', 'ROAD'],
      required: true,
    },
    speedKmh: {
      type: Number,
    },
    eventType: {
      type: String,
      enum: ['DEPARTED', 'IN_TRANSIT', 'PORT_ARRIVAL', 'CUSTOMS_HOLD', 'DELIVERED'],
      required: true,
    },
    metadata: {
      vesselId: String,
      temperature: Number,
      notes: String,
    },
  },
  {
    timestamps: false,
  }
);

// Compound index
TransitTelemetrySchema.index({ orderId: 1, timestamp: -1 });

export const TransitTelemetry = model<ITransitTelemetry>('TransitTelemetry', TransitTelemetrySchema);
