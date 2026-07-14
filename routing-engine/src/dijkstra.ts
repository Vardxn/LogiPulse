import { Graph } from "./Graph";
import { EdgeConditions, RouteResult, GraphEdge, RouteStep } from "./types";
import { calculateEdgeWeight } from "./weightCalculator";

export function findShortestPathDijkstra(
  graph: Graph,
  startId: string,
  endId: string,
  conditionsMap: Map<string, EdgeConditions>
): RouteResult {
  if (!graph.hasNode(startId) || !graph.hasNode(endId)) {
    throw new Error("Start or End node does not exist in the routing graph.");
  }

  const defaultConditions: EdgeConditions = { congestionScore: 0, weatherPenalty: 0, fuelCostIndex: 0 };
  const distances: Record<string, number> = {};
  const backpointers: Record<string, { fromNodeId: string; viaEdge: GraphEdge } | null> = {};
  const unvisitedSet = new Set<string>();

  for (const nodeId of graph.getAllNodeIds()) {
    distances[nodeId] = Infinity;
    backpointers[nodeId] = null;
    unvisitedSet.add(nodeId);
  }
  distances[startId] = 0;

  while (unvisitedSet.size > 0) {
    let currentId: string | null = null;
    let minDistance = Infinity;

    for (const nodeId of unvisitedSet) {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        currentId = nodeId;
      }
    }

    if (currentId === null || currentId === endId || distances[currentId] === Infinity) {
      break;
    }

    unvisitedSet.delete(currentId);

    const neighbors = graph.getNeighbors(currentId);
    for (const edge of neighbors) {
      if (!unvisitedSet.has(edge.to)) continue;

      // Extract compound edge key or fallback to default operational scores
      const conditions = conditionsMap.get(`${edge.from}->${edge.to}:${edge.mode}`) || defaultConditions;
      const weight = calculateEdgeWeight(edge, conditions);
      const alternativePathDistance = distances[currentId] + weight;

      if (alternativePathDistance < distances[edge.to]) {
        distances[edge.to] = alternativePathDistance;
        backpointers[edge.to] = { fromNodeId: currentId, viaEdge: edge };
      }
    }
  }

  if (distances[endId] === Infinity) {
    throw new Error(`No viable multi-modal transit path exists between ${startId} and ${endId}.`);
  }

  // Reconstruction logic
  const pathSteps: RouteStep[] = [];
  let current = endId;

  while (current !== startId) {
    const pointer = backpointers[current];
    if (!pointer) break;
    pathSteps.unshift({ nodeId: current, mode: pointer.viaEdge.mode });
    current = pointer.fromNodeId;
  }
  pathSteps.unshift({ nodeId: startId, mode: null });

  // Synthesize metrics aggregates
  let totalDistanceKm = 0;
  let totalCost = 0;
  let currentTrackNode = startId;

  for (let i = 1; i < pathSteps.length; i++) {
    const step = pathSteps[i];
    const edgeUsed = graph.getNeighbors(currentTrackNode).find(e => e.to === step.nodeId && e.mode === step.mode)!;
    totalDistanceKm += edgeUsed.distanceKm;
    
    const conditions = conditionsMap.get(`${edgeUsed.from}->${edgeUsed.to}:${edgeUsed.mode}`) || defaultConditions;
    totalCost += calculateEdgeWeight(edgeUsed, conditions) * 25; // Base operational multiplier factor
    currentTrackNode = step.nodeId;
  }

  return {
    path: pathSteps,
    totalDistanceKm,
    totalCost,
    estimatedDurationHrs: distances[endId]
  };
}
