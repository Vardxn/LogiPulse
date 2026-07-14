import { GraphNode, GraphEdge } from 'routing-engine';

export interface RouteRequest {
  nodes: GraphNode[];
  edges: GraphEdge[];
  startNodeId: string;
  endNodeId: string;
}
