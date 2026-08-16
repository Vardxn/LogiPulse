import client from "prom-client";

// Setup registry
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Latency Histograms
export const ocrPipelineLatency = new client.Histogram({
  name: "logipulse_ocr_pipeline_latency_seconds",
  help: "Latency of OCR pipeline",
  buckets: [0.1, 0.5, 1, 2, 5, 10, 15]
});
register.registerMetric(ocrPipelineLatency);

export const ragQueryLatency = new client.Histogram({
  name: "logipulse_rag_query_latency_seconds",
  help: "Latency of RAG hybrid query and generation",
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});
register.registerMetric(ragQueryLatency);

export const routingEngineLatency = new client.Histogram({
  name: "logipulse_routing_engine_latency_seconds",
  help: "Latency of the Dijkstra/A* routing engine compute",
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});
register.registerMetric(routingEngineLatency);

export const metricsRegistry = register;
