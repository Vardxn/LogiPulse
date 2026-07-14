import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import mongoose from "mongoose";
import { createTelemetrySchema } from "../schemas";

const prisma = new PrismaClient();

// Setup the matching runtime model for TransitTelemetry collection
const TransitTelemetrySchema = new mongoose.Schema({
  orderId: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  transportMode: { type: String, required: true },
  speedKmh: { type: Number, required: true },
  eventType: { type: String, required: true },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed }
});

const TransitTelemetry = mongoose.models.TransitTelemetry || 
  mongoose.model("TransitTelemetry", TransitTelemetrySchema, "transit_telemetry");

export async function logTelemetry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { orderId } = req.params;
    const validatedBody = createTelemetrySchema.parse(req.body);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.tenantId !== tenantId) {
      res.status(404).json({ success: false, error: "Associated order target not found." });
      return;
    }

    const telemetryDoc = await TransitTelemetry.create({
      orderId,
      timestamp: new Date(),
      ...validatedBody
    });

    res.status(201).json({ success: true, data: telemetryDoc });
  } catch (error) {
    next(error);
  }
}

export async function getTelemetry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.tenantId !== tenantId) {
      res.status(404).json({ success: false, error: "Associated order target not found." });
      return;
    }

    const telemetryLogs = await TransitTelemetry.find({ orderId })
      .sort({ timestamp: -1 })
      .limit(50);

    res.status(200).json({ success: true, data: telemetryLogs });
  } catch (error) {
    next(error);
  }
}
