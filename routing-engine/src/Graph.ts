import { GraphNode, GraphEdge } from "./types";

export class Graph {
  private nodes: Map<string, GraphNode> = new Map();
  private adjacencyList: Map<string, GraphEdge[]> = new Map();

  public addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, []);
    }
  }

  public addEdge(edge: GraphEdge): void {
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) {
      throw new Error(`Cannot add edge: One or both nodes (${edge.from} -> ${edge.to}) do not exist.`);
    }
    this.adjacencyList.get(edge.from)!.push(edge);
  }

  public getNode(nodeId: string): GraphNode | undefined {
    return this.nodes.get(nodeId);
  }

  public getNeighbors(nodeId: string): GraphEdge[] {
    return this.adjacencyList.get(nodeId) || [];
  }

  public getAllNodeIds(): string[] {
    return Array.from(this.nodes.keys());
  }

  public hasNode(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }
}
