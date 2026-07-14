import { GraphNode } from "./types";

/**
 * Calculates the great-circle distance between two points on the Earth using the Haversine formula.
 * Provides an admissible, consistent lower-bound heuristic for the A* search algorithm.
 */
export function calculateHaversineDistance(nodeA: GraphNode, nodeB: GraphNode): number {
  const EARTH_RADIUS_KM = 6371;
  const dLat = ((nodeB.lat - nodeA.lat) * Math.PI) / 180;
  const dLng = ((nodeB.lng - nodeA.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nodeA.lat * Math.PI) / 180) *
      Math.cos((nodeB.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}
