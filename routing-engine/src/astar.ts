import { Graph } from "./Graph";
import { EdgeConditions, RouteResult, GraphEdge, RouteStep } from "./types";
import { calculateEdgeWeight } from "./weightCalculator";
import { calculateHaversineDistance } from "./geoUtils";

export function findShortestPathAStar(
  graph: Graph,
  startId: string,
  endId: string,
  conditionsMap: Map<string, EdgeConditions>
): RouteResult {
  if (!graph.hasNode(startId) || !graph.hasNode(endId)) {
    throw new Error("Start or End node does not exist in the routing graph.");
  }

  const targetNode = graph.getNode(endId)!;
  const defaultConditions: EdgeConditions = { congestionScore: 0, weatherPenalty: 0, fuelCostIndex: 0 };

  const gScore: Record<string, number> = {};
  const fScore: Record<string, number> = {};
  const backpointers: Record<string, { fromNodeId: string; viaEdge: GraphEdge } | null> = {};
  const openSet = new Set<string>([startId]);

  for (const nodeId of graph.getAllNodeIds()) {
    gScore[nodeId] = Infinity;
    fScore[nodeId] = Infinity;
    backpointers[nodeId] = null;
  }

  gScore[startId] = 0;
  fScore[startId] = calculateHaversineDistance(graph.getNode(startId)!, targetNode) / 100; // Normalized baseline heuristic speed metric

  while (openSet.size > 0) {
    let currentId = Array.from(openSet).reduce((minNode, node) => 
      fScore[node] < fScore[minNode] ? node : minNode
    );

    if (currentId === endId) break;

    openSet.delete(currentId);

    const neighbors = graph.getNeighbors(currentId);
    for (const edge of neighbors) {
      const conditions = conditionsMap.get(`${edge.from}->${edge.to}:${edge.mode}`) || defaultConditions;
      const weight = calculateEdgeWeight(edge, conditions);
      const tentativeGScore = gScore[currentId] + weight;

      if (tentativeGScore < gScore[edge.to]) {
        backpointers[edge.to] = { fromNodeId: currentId, viaEdge: edge };
        gScore[edge.to] = tentativeGScore;
        
        const hScore = calculateHaversineDistance(graph.getNode(edge.to)!, targetNode) / edge.baseSpeedKmh;
        fScore[edge.to] = gScore[edge.to] + hScore;

        openSet.add(edge.to);
      }
    }
  }

  if (gScore[endId] === Infinity) {
    throw new Error(`No viable multi-modal transit path exists via A* optimization between ${startId} and ${endId}.`);
  }

  const pathSteps: RouteStep[] = [];
  let current = endId;

  while (current !== startId) {
    const pointer = backpointers[current];
    if (!pointer) break;
    pathSteps.unshift({ nodeId: current, mode: pointer.viaEdge.mode });
    current = pointer.fromNodeId;
  }
  pathSteps.unshift({ nodeId: startId, mode: null });

  let totalDistanceKm = 0;
  let totalCost = 0;
  let currentTrackNode = startId;

  for (let i = 1; i < pathSteps.length; i++) {
    const step = pathSteps[i];
    const edgeUsed = graph.getNeighbors(currentTrackNode).find(e => e.to === step.nodeId && e.mode === step.mode)!;
    totalDistanceKm += edgeUsed.distanceKm;
    const conditions = conditionsMap.get(`${edgeUsed.from}->${edgeUsed.to}:${edgeUsed.mode}`) || defaultConditions;
    totalCost += calculateEdgeWeight(edgeUsed, conditions) * 25;
    currentTrackNode = step.nodeId;
  }

  return {
    path: pathSteps,
    totalDistanceKm,
    totalCost,
    estimatedDurationHrs: gScore[endId]
  };
}
