import { GraphEdge, EdgeConditions } from "./types";

/**
 * Computes the dynamic edge cost weight using real-time operational metrics.
 * * Formula Business Mechanics:
 * - baseTravelTime: The theoretical ideal time to transit the edge (hours).
 * - congestionScore penalty: Accounts for variable delays (e.g., port backlogs or traffic gridlock). Max +2 hours.
 * - weatherPenalty: Mitigates safety risks by penalizing routes facing adverse weather. Max +1.5 hours.
 * - fuelCostIndex: Reflects dynamic financial volatility on the route leg.
 */
export function calculateEdgeWeight(edge: GraphEdge, conditions: EdgeConditions): number {
  const baseTravelTime = edge.distanceKm / edge.baseSpeedKmh;
  const congestionImpact = conditions.congestionScore * 2;
  const weatherImpact = conditions.weatherPenalty * 1.5;
  const financialImpact = conditions.fuelCostIndex * 0.5;

  return baseTravelTime + congestionImpact + weatherImpact + financialImpact;
}
