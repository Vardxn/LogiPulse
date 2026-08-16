import { PrismaClient } from "@prisma/client";
import mongoose from "mongoose";
import { computeRoute, Graph, EdgeConditions } from "routing-engine";
import { routingEngineLatency } from "../utils/metrics";

const prisma = new PrismaClient();

// Mongoose schema definition matching the feed collection
interface IRouteConditionFeed extends mongoose.Document {
  nodeId: string;
  timestamp: Date;
  congestionScore: number;
  weatherPenalty: number;
  fuelCostIndex: number;
}

const RouteConditionFeedSchema = new mongoose.Schema({
  nodeId: { type: String, required: true },
  timestamp: { type: Date, required: true },
  congestionScore: { type: Number, required: true },
  weatherPenalty: { type: Number, required: true },
  fuelCostIndex: { type: Number, required: true }
});

const RouteConditionFeed = mongoose.models.RouteConditionFeed || 
  mongoose.model<IRouteConditionFeed>("RouteConditionFeed", RouteConditionFeedSchema, "route_condition_feeds");

export async function computeAndSaveRoute(
  orderId: string,
  graph: Graph,
  startNodeId: string,
  endNodeId: string,
  strategy: "dijkstra" | "astar" = "dijkstra"
) {
  // 1. Fail Fast: Validate order existence in PostgreSQL
  const orderExists = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!orderExists) {
    throw new Error(`Routing aborted: Order ID ${orderId} does not exist in the database.`);
  }

  // 2. Efficiently Batch Query MongoDB: Use aggregation pipeline instead of a loop to avoid N+1 query patterns
  const nodeIds = graph.getAllNodeIds();
  const latestConditions = await RouteConditionFeed.aggregate([
    { $match: { nodeId: { $in: nodeIds } } },
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: "$nodeId",
        latestDoc: { $first: "$$ROOT" }
      }
    }
  ]);

  // Convert aggregation payload into an easily accessible Map
  const conditionRecordsMap = new Map<string, IRouteConditionFeed>(
    latestConditions.map(item => [item._id, item.latestDoc])
  );

  // 3. Build conditionsMap Map structure expected by the Core routing engine
  const conditionsMap = new Map<string, EdgeConditions>();

  for (const fromNodeId of nodeIds) {
    const neighbors = graph.getNeighbors(fromNodeId);
    for (const edge of neighbors) {
      const targetNodeId = edge.to;
      
      // Determine operational condition tracking data based on destination node metrics
      const feedData = conditionRecordsMap.get(targetNodeId);
      
      let edgeConditions: EdgeConditions;
      if (!feedData) {
        console.warn(`[Routing Warning] No condition tracking telemetry found for Node: ${targetNodeId}. Applying baseline metrics.`);
        edgeConditions = { congestionScore: 0, weatherPenalty: 0, fuelCostIndex: 0.5 };
      } else {
        edgeConditions = {
          congestionScore: feedData.congestionScore,
          weatherPenalty: feedData.weatherPenalty,
          fuelCostIndex: feedData.fuelCostIndex
        };
      }
      
      // Map configuration key string pattern exactly as required by the algorithm components
      conditionsMap.set(`${fromNodeId}->${targetNodeId}:${edge.mode}`, edgeConditions);
    }
  }

  // 4. Fire compute execution through the routing module
  const end = routingEngineLatency.startTimer();
  const routeResult = computeRoute(graph, startNodeId, endNodeId, conditionsMap, strategy);
  end();

  // 5. Upsert the computed structural matrix into Postgres via Prisma
  const savedRoute = await prisma.shipmentRoute.upsert({
    where: { orderId: orderId },
    update: {
      path: JSON.stringify(routeResult.path),
      totalDistanceKm: routeResult.totalDistanceKm,
      totalCost: routeResult.totalCost,
      estimatedDurationHrs: routeResult.estimatedDurationHrs,
      computedAt: new Date()
    },
    create: {
      orderId: orderId,
      path: JSON.stringify(routeResult.path),
      totalDistanceKm: routeResult.totalDistanceKm,
      totalCost: routeResult.totalCost,
      estimatedDurationHrs: routeResult.estimatedDurationHrs,
      computedAt: new Date()
    }
  });

  return savedRoute;
}
