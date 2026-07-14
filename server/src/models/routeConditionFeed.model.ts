import { Schema, model, Document } from 'mongoose';

export interface IRouteConditionFeed extends Document {
  nodeId: string;
  timestamp: Date;
  congestionScore: number;
  weatherPenalty: number;
  fuelCostIndex: number;
}

const RouteConditionFeedSchema = new Schema<IRouteConditionFeed>(
  {
    nodeId: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    congestionScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    weatherPenalty: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    fuelCostIndex: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

// Index on nodeId and timestamp desc
RouteConditionFeedSchema.index({ nodeId: 1, timestamp: -1 });

export const RouteConditionFeed = model<IRouteConditionFeed>('RouteConditionFeed', RouteConditionFeedSchema);
