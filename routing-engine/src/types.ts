export interface GraphNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export type TransportMode = "SEA" | "RAIL" | "ROAD";

export interface GraphEdge {
  from: string;
  to: string;
  mode: TransportMode;
  distanceKm: number;
  baseSpeedKmh: number;
}

export interface EdgeConditions {
  congestionScore: number; // Scale: 0 - 1
  weatherPenalty: number;  // Scale: 0 - 1
  fuelCostIndex: number;   // Index modifier
}

export interface RouteStep {
  nodeId: string;
  mode: TransportMode | null;
}

export interface RouteResult {
  path: RouteStep[];
  totalDistanceKm: number;
  totalCost: number;
  estimatedDurationHrs: number;
}
