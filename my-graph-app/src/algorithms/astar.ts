// src/algorithms/astar.ts
export interface Graph {
  [nodeId: string]: { id: string; weight: number }[];
}

export interface Positions {
  [nodeId: string]: { x: number; y: number };
}

export interface AStarResult {
  visitedOrder: string[];
  visitedEdges: [string, string][];
  path: string[];
  distance: number;
}

function heuristic(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function aStar(
  graph: Graph,
  positions: Positions,
  startId: string,
  endId: string
): AStarResult {
  const openSet = new Set<string>([startId]);
  const cameFrom: Record<string, string | null> = {};
  const gScore: Record<string, number> = {};
  const fScore: Record<string, number> = {};
  const visitedOrder: string[] = [];
  const visitedEdges: [string, string][] = [];

  for (const n in graph) {
    gScore[n] = Infinity;
    fScore[n] = Infinity;
    cameFrom[n] = null;
  }
  gScore[startId] = 0;
  fScore[startId] = heuristic(positions[startId], positions[endId]);

  while (openSet.size > 0) {
    let current: string | null = null;
    for (const n of openSet) {
      if (current === null || fScore[n] < fScore[current]) {
        current = n;
      }
    }
    if (!current) break;

    openSet.delete(current);
    visitedOrder.push(current);

    if (current === endId) {
      const path: string[] = [];
      let u: string | null = current;
      while (u) {
        path.unshift(u);
        u = cameFrom[u];
      }
      return { visitedOrder, visitedEdges, path, distance: gScore[endId] };
    }

    for (const edge of graph[current]) {
      const neighbor = edge.id;
      visitedEdges.push([current, neighbor]);
      const tentativeG = gScore[current] + edge.weight;
      if (tentativeG < gScore[neighbor]) {
        cameFrom[neighbor] = current;
        gScore[neighbor] = tentativeG;
        fScore[neighbor] = tentativeG + heuristic(positions[neighbor], positions[endId]);
        openSet.add(neighbor);
      }
    }
  }

  return { visitedOrder, visitedEdges, path: [], distance: Infinity };
}