import { Request, Response } from "express";
import { computeAndSaveRoute } from "../services/routingService";
import { Graph } from "routing-engine";

// Singleton application graph network layer dependency initialization
const applicationGlobalGraph = new Graph();

// Pre-populate graph with seeded nodes and a default route leg for demonstration using valid database UUIDs
applicationGlobalGraph.addNode({ id: "a2b0d778-d567-4a0b-8514-99881a174001", name: "Mumbai Port Hub", lat: 19.0760, lng: 72.8777 });
applicationGlobalGraph.addNode({ id: "b6d0e889-e678-5b0c-9615-aa992b275002", name: "Delhi Container Depot", lat: 28.6139, lng: 77.2090 });
applicationGlobalGraph.addEdge({ from: "a2b0d778-d567-4a0b-8514-99881a174001", to: "b6d0e889-e678-5b0c-9615-aa992b275002", mode: "ROAD", distanceKm: 1400, baseSpeedKmh: 60 });

export async function handleCalculateOrderRoute(req: Request, res: Response): Promise<void> {
  try {
    const { orderId } = req.params;
    const { startNodeId, endNodeId, strategy } = req.body;

    if (!startNodeId || !endNodeId) {
      res.status(400).json({ error: "Missing mandatory configuration inputs: startNodeId and endNodeId are required." });
      return;
    }

    if (strategy && strategy !== "dijkstra" && strategy !== "astar") {
      res.status(400).json({ error: "Invalid optimization strategy specified. Use 'dijkstra' or 'astar'." });
      return;
    }

    // Call routing processing service
    const shipmentRouteRecord = await computeAndSaveRoute(
      orderId,
      applicationGlobalGraph,
      startNodeId,
      endNodeId,
      strategy || "dijkstra"
    );

    res.status(200).json({
      success: true,
      data: shipmentRouteRecord
    });
  } catch (error: any) {
    console.error("[Routing Controller Error]:", error.message);
    
    if (error.message.includes("does not exist in the database")) {
      res.status(404).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: "Internal routing engine execution error: " + error.message });
  }
}
