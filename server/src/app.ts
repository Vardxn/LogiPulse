import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import vendorRoutes from "./routes/vendorRoutes";
import orderRoutes from "./routes/orderRoutes";
import inventoryRoutes from "./routes/inventoryRoutes";
import trackingRoutes from "./routes/trackingRoutes";
import routingRoutes from "./routes/routingRoutes";
import ragRoutes from "./routes/ragRoutes";
import { metricsRegistry } from "./utils/metrics";
import { globalErrorHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors());
app.use(express.json());

// Main Routing mount pathways
app.use("/api/auth", authRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/rag", ragRoutes);
app.use("/api", routingRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime() });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

// Catch-all structural error handler interceptor
app.use(globalErrorHandler);

export default app;
