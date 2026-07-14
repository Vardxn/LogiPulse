import { Graph } from "./Graph";
import { calculateEdgeWeight } from "./weightCalculator";
import { computeRoute } from "./index";
import { EdgeConditions, GraphEdge } from "./types";

describe("LogiPulse Routing Engine Suite", () => {
  let graph: Graph;
  let conditionsMap: Map<string, EdgeConditions>;

  beforeEach(() => {
    graph = new Graph();
    conditionsMap = new Map();

    // Define 5 testing hubs geographically distributed
    graph.addNode({ id: "N1", name: "Mundra Port", lat: 22.83, lng: 69.7 });
    graph.addNode({ id: "N2", name: "Ahmedabad Hub", lat: 23.02, lng: 72.57 });
    graph.addNode({ id: "N3", name: "Delhi IDC", lat: 28.61, lng: 77.2 });
    graph.addNode({ id: "N4", name: "Jaipur Junction", lat: 26.91, lng: 75.78 });
    graph.addNode({ id: "N5", name: "Isolated Node", lat: 10.0, lng: 10.0 });

    // Multi-modal parallel paths simulation (N1 -> N2 via both ROAD and RAIL)
    graph.addEdge({ from: "N1", to: "N2", mode: "ROAD", distanceKm: 400, baseSpeedKmh: 50 });
    graph.addEdge({ from: "N1", to: "N2", mode: "RAIL", distanceKm: 380, baseSpeedKmh: 80 });
    
    graph.addEdge({ from: "N2", to: "N3", mode: "RAIL", distanceKm: 900, baseSpeedKmh: 90 });
    graph.addEdge({ from: "N2", to: "N4", mode: "ROAD", distanceKm: 600, baseSpeedKmh: 60 });
    graph.addEdge({ from: "N4", to: "N3", mode: "ROAD", distanceKm: 300, baseSpeedKmh: 60 });
  });

  test("should compute higher weight isolated parameters if congestion increases", () => {
    const edge: GraphEdge = { from: "N1", to: "N2", mode: "ROAD", distanceKm: 100, baseSpeedKmh: 50 };
    const clearConditions: EdgeConditions = { congestionScore: 0.1, weatherPenalty: 0, fuelCostIndex: 0 };
    const jammedConditions: EdgeConditions = { congestionScore: 0.9, weatherPenalty: 0, fuelCostIndex: 0 };

    const clearWeight = calculateEdgeWeight(edge, clearConditions);
    const jammedWeight = calculateEdgeWeight(edge, jammedConditions);

    expect(jammedWeight).toBeGreaterThan(clearWeight);
    expect(jammedWeight).toBe(2 + (0.9 * 2)); // 2 hours base + 1.8 hours penalty
  });

  test("should determine optimal path using parallel multi-modal paths correctly", () => {
    // Injecting standard zero configuration factors
    const resDijkstra = computeRoute(graph, "N1", "N3", conditionsMap, "dijkstra");
    const resAStar = computeRoute(graph, "N1", "N3", conditionsMap, "astar");

    // Both strategies must choose RAIL for N1->N2 because it takes 4.75 hrs vs ROAD's 8 hrs
    expect(resDijkstra.path[1]).toEqual({ nodeId: "N2", mode: "RAIL" });
    expect(resDijkstra.estimatedDurationHrs).toBeCloseTo(14.75, 2); // 380/80 + 900/90
    expect(resAStar.estimatedDurationHrs).toEqual(resDijkstra.estimatedDurationHrs);
  });

  test("should throw handling error exceptions gracefully if destination is unreachable", () => {
    expect(() => computeRoute(graph, "N1", "N5", conditionsMap, "dijkstra")).toThrow();
    expect(() => computeRoute(graph, "N1", "N5", conditionsMap, "astar")).toThrow();
  });

  test("should throw when start or end node does not exist in the graph framework", () => {
    expect(() => computeRoute(graph, "INVALID", "N3", conditionsMap, "dijkstra")).toThrow();
  });

  test("should guarantee that A* and Dijkstra return identical optimal costs on the same graph topology", () => {
    // Populate the conditions map to ensure we are testing under loaded conditions
    conditionsMap.set("N1->N2:RAIL", { congestionScore: 0.2, weatherPenalty: 0.1, fuelCostIndex: 1.1 });
    conditionsMap.set("N2->N3:RAIL", { congestionScore: 0.5, weatherPenalty: 0.4, fuelCostIndex: 1.2 });

    const resDijkstra = computeRoute(graph, "N1", "N3", conditionsMap, "dijkstra");
    const resAStar = computeRoute(graph, "N1", "N3", conditionsMap, "astar");

    // Crucial test check for your interview script
    expect(resAStar.estimatedDurationHrs).toEqual(resDijkstra.estimatedDurationHrs);
    expect(resAStar.totalDistanceKm).toEqual(resDijkstra.totalDistanceKm);
    expect(resAStar.totalCost).toEqual(resDijkstra.totalCost);
    expect(resAStar.path).toEqual(resDijkstra.path);
  });
});
