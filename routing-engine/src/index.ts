import { Graph } from "./Graph";
import { EdgeConditions, RouteResult } from "./types";
import { findShortestPathDijkstra } from "./dijkstra";
import { findShortestPathAStar } from "./astar";

export function computeRoute(
  graph: Graph,
  startId: string,
  endId: string,
  conditionsMap: Map<string, EdgeConditions>,
  strategy: "dijkstra" | "astar"
): RouteResult {
  if (strategy === "astar") {
    return findShortestPathAStar(graph, startId, endId, conditionsMap);
  }
  return findShortestPathDijkstra(graph, startId, endId, conditionsMap);
}

export { Graph } from "./Graph";
export * from "./types";
