// src/algorithms/dijkstra.ts
export interface Graph {
  [nodeId: string]: { id: string; weight: number }[];
}

export interface DijkstraResult {
  visitedOrder: string[];
  visitedEdges: [string, string][];
  path: string[];
  distance: number;
}

export function dijkstra(
  graph: Graph,
  startId: string,
  endId: string
): DijkstraResult {
  const distances: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const visitedOrder: string[] = [];
  const visitedEdges: [string, string][] = [];
  const unvisited = new Set(Object.keys(graph));

  for (const n of unvisited) {
    distances[n] = Infinity;
    prev[n] = null;
  }
  distances[startId] = 0;

  while (unvisited.size > 0) {
    let u: string | null = null;
    for (const n of unvisited) {
      if (u === null || distances[n] < distances[u]) {
        u = n;
      }
    }
    if (u === null) break;
    unvisited.delete(u);
    visitedOrder.push(u);

    if (u === endId) break;

    for (const edge of graph[u]) {
      const v = edge.id;
      visitedEdges.push([u, v]);
      const alt = distances[u] + edge.weight;
      if (alt < distances[v]) {
        distances[v] = alt;
        prev[v] = u;
      }
    }
  }

  const path: string[] = [];
  let u: string | null = endId;
  if (prev[u] !== null || u === startId) {
    while (u) {
      path.unshift(u);
      u = prev[u];
    }
  }

  const distance = distances[endId];
  return { visitedOrder, visitedEdges, path, distance };
}