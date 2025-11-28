// src/components/GraphVisualizerCytoscape.tsx

import React, { useEffect, useRef, useState } from 'react';
import Cytoscape from 'cytoscape';
import { dijkstra } from '../algorithms/dijkstra';
import { aStar } from '../algorithms/astar';

// --- 1. DEFINICIÓN DE DATASETS (Escenarios) ---

// Escenario 1: Grafo Simple (Original)
const SIMPLE_POS = {
  A: { x: 50,  y: 50  }, B: { x: 150, y: 50  }, C: { x: 250, y: 50  },
  D: { x: 150, y: 150 }, E: { x: 250, y: 150 }, X: { x: 50,  y: 150 },
  Y: { x: 50,  y: 250 }, Z: { x: 150, y: 250 }, M: { x: 250, y: 250 },
  N: { x: 350, y: 150 },
};
const SIMPLE_EDGES: [string, string][] = [
  ['A','B'], ['B','C'], ['C','D'], ['D','E'], ['A','X'], 
  ['X','Y'], ['Y','Z'], ['Z','E'], ['B','Y'], ['C','Z'], 
  ['X','D'], ['D','N'], ['N','M'],
];

// Escenario 2: Grafo Avanzado (15 Nodos, estructura compleja)
const ADVANCED_POS = {
  // Columna 1
  N1: { x: 0, y: 0 },   N2: { x: 0, y: 100 },  N3: { x: 0, y: 200 },  N4: { x: 0, y: 300 },
  // Columna 2
  N5: { x: 100, y: 50 }, N6: { x: 100, y: 150 }, N7: { x: 100, y: 250 },
  // Columna 3 (Central)
  N8: { x: 200, y: 0 },  N9: { x: 200, y: 100 }, N10: { x: 200, y: 200 }, N11: { x: 200, y: 300 },
  // Columna 4
  N12: { x: 300, y: 50 }, N13: { x: 300, y: 250 },
  // Columna 5 (Finales)
  N14: { x: 400, y: 100 }, N15: { x: 400, y: 200 }
};

const ADVANCED_EDGES: [string, string][] = [
  // Conexiones verticales/cercanas
  ['N1','N5'], ['N1','N8'], ['N2','N5'], ['N2','N6'], ['N3','N6'], ['N3','N7'], ['N4','N7'], ['N4','N11'],
  // Conexiones medias
  ['N5','N8'], ['N5','N9'], ['N6','N9'], ['N6','N10'], ['N7','N10'], ['N7','N11'],
  // Interconexiones densas
  ['N8','N12'], ['N9','N12'], ['N9','N13'], ['N10','N13'], ['N11','N13'],
  // Finales
  ['N12','N14'], ['N13','N14'], ['N13','N15'], ['N14','N15'],
  // Atajos largos (Cross-links)
  ['N2','N3'], ['N8','N9'], ['N10','N11'], ['N5','N12'] 
];

const DATASETS = {
  simple: { pos: SIMPLE_POS, edges: SIMPLE_EDGES },
  advanced: { pos: ADVANCED_POS, edges: ADVANCED_EDGES }
};

// --- FIN DATASETS ---

interface Graph {
  [nodeId: string]: Array<{ id: string; weight: number }>;
}

// Modificado para recibir datos dinámicos
function buildGraph(positions: Record<string, {x: number, y: number}>, edges: [string, string][]): { graph: Graph; cyElements: Cytoscape.ElementDefinition[] } {
  const graph: Graph = {};
  for (const n in positions) {
    graph[n] = [];
  }
  const cyElements: Cytoscape.ElementDefinition[] = [];

  // Nodos
  for (const id in positions) {
    cyElements.push({ data: { id }, position: positions[id] });
  }

  // Aristas
  edges.forEach(([u, v]) => {
    const p1 = positions[u];
    const p2 = positions[v];
    // Validación básica por seguridad
    if(!p1 || !p2) return;

    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const w = Math.hypot(dx, dy);
    
    graph[u].push({ id: v, weight: w });
    graph[v].push({ id: u, weight: w });
    
    cyElements.push({
      data: { 
        id: `${u}-${v}`, 
        source: u, 
        target: v, 
        weight: w,
        label: Math.round(w).toString() 
      }
    });
  });

  return { graph, cyElements };
}

const CY_STYLES: any[] = [
  {
    selector: 'node',
    style: {
      'background-color': '#e0e0e0',
      'border-width': 2,
      'border-color': '#999',
      'label': 'data(id)',
      'text-valign': 'center',
      'text-halign': 'center',
      'width': 40,
      'height': 40,
      'font-weight': 'bold',
      'color': '#333'
    }
  },
  {
    selector: 'edge',
    style: {
      'line-color': '#ccc',
      'width': 3,
      'curve-style': 'bezier',
      'label': 'data(label)',
      'font-size': '10px', // Un poco más pequeño para el grafo denso
      'text-background-opacity': 1,
      'text-background-color': '#ffffff',
      'text-background-padding': '2px',
      'text-background-shape': 'roundrectangle',
      'color': '#666',
      'text-rotation': 'autorotate'
    }
  },
  {
    selector: '.start-node',
    style: {
      'background-color': '#4CAF50',
      'border-color': '#2E7D32',
      'border-width': 4,
      'width': 50,
      'height': 50,
      'color': '#fff',
      'text-outline-color': '#2E7D32',
      'text-outline-width': 2
    }
  },
  {
    selector: '.end-node',
    style: {
      'background-color': '#F44336',
      'border-color': '#C62828',
      'border-width': 4,
      'width': 50,
      'height': 50,
      'color': '#fff',
      'text-outline-color': '#C62828',
      'text-outline-width': 2
    }
  },
  {
    selector: '.visited-node',
    style: { 'background-color': '#BBDEFB', 'border-color': '#64B5F6' }
  },
  {
    selector: '.visited-edge',
    style: { 'line-color': '#BBDEFB', 'width': 4 }
  },
  {
    selector: '.path-edge',
    style: { 'line-color': '#FF9800', 'width': 6, 'z-index': 999 }
  },
  {
    selector: '.final-path-node',
    style: { 'border-width': 6, 'border-color': '#FF9800' }
  }
];

export const GraphVisualizerCytoscape: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cy, setCy] = useState<Cytoscape.Core | null>(null);

  // --- NUEVO ESTADO: CONTROL DE ESCENARIO ---
  const [scenario, setScenario] = useState<'simple' | 'advanced'>('simple');
  
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd]     = useState<string | null>(null);
  const [algo, setAlgo]   = useState<'dijkstra' | 'astar'>('dijkstra');

  const [visitedOrder,  setVisitedOrder]  = useState<string[]>([]);
  const [visitedEdges,  setVisitedEdges]  = useState<[string,string][]>([]);
  const [path,          setPath]          = useState<string[]>([]);
  const [distance,      setDistance]      = useState<number | null>(null);

  // Construimos el grafo basándonos en el escenario actual
  const currentData = DATASETS[scenario];
  const { graph, cyElements } = buildGraph(currentData.pos, currentData.edges);

  // REINICIO COMPLETO AL CAMBIAR DE ESCENARIO
  useEffect(() => {
    setStart(null);
    setEnd(null);
    setVisitedOrder([]);
    setVisitedEdges([]);
    setPath([]);
    setDistance(null);
  }, [scenario]);

  // Inicialización de Cytoscape (Se recrea cuando cambia cyElements -> scenario)
  useEffect(() => {
    if (!containerRef.current) return;
    
    const instance = Cytoscape({
      container: containerRef.current,
      elements: cyElements,
      style: CY_STYLES,
      layout: { name: 'preset', padding: 20 },
      minZoom: 0.3,
      maxZoom: 2,
      wheelSensitivity: 0.2
    });
    
    // Auto-fit para centrar el nuevo grafo
    instance.fit();
    setCy(instance);

    return () => { instance.destroy(); };
  }, [scenario]); // Dependencia clave: scenario

  // Refs y Event Listeners (Igual que antes)
  const startRef = useRef(start);
  const endRef = useRef(end);
  useEffect(() => { startRef.current = start; }, [start]);
  useEffect(() => { endRef.current = end; }, [end]);

  useEffect(() => {
    if (!cy) return;
    cy.off('tap', 'node');
    cy.on('tap', 'node', (evt) => {
      const id = (evt.target as any).id();
      const s = startRef.current;
      const e = endRef.current;

      if (s === id) { setStart(null); }
      else if (e === id) { setEnd(null); }
      else if (!s) { setStart(id); }
      else { setEnd(id); }
    });
  }, [cy]);

  // Sync de clases visuales
  useEffect(() => {
    if (!cy) return;
    cy.elements().removeClass('start-node end-node');
    if (start) cy.getElementById(start).addClass('start-node');
    if (end) cy.getElementById(end).addClass('end-node');
  }, [cy, start, end]);

  // Limpieza visual al cambiar selección
  useEffect(() => {
     if(cy && (!start || !end)) {
        cy.elements().removeClass('visited-node visited-edge path-edge final-path-node');
        setPath([]);
        setDistance(null);
        setVisitedOrder([]);
        setVisitedEdges([]);
     }
  }, [start, end, cy]);

  const runAlgo = () => {
    if (!start || !end || !cy) {
      alert('Selecciona nodo inicio y fin.');
      return;
    }
    cy.elements().removeClass('visited-node visited-edge path-edge final-path-node');

    // Usamos el 'graph' reconstruido para el escenario actual
    const result = algo === 'dijkstra'
      ? dijkstra(graph, start, end)
      : aStar(graph, currentData.pos as any, start, end);

    setVisitedOrder(result.visitedOrder);
    setVisitedEdges(result.visitedEdges || []);
    setPath(result.path);
    setDistance(result.distance);

    cy.batch(() => {
      result.visitedOrder.forEach(nid => {
        if (nid !== start && nid !== end) cy.getElementById(nid)?.addClass('visited-node');
      });
      (result.visitedEdges || []).forEach(([u,v]) => {
        const edge = cy.getElementById(`${u}-${v}`).length ? cy.getElementById(`${u}-${v}`) : cy.getElementById(`${v}-${u}`);
        edge.addClass('visited-edge');
      });
      for (let i = 0; i < result.path.length - 1; i++) {
        const u = result.path[i];
        const v = result.path[i+1];
        const edge = cy.getElementById(`${u}-${v}`).length ? cy.getElementById(`${u}-${v}`) : cy.getElementById(`${v}-${u}`);
        edge.addClass('path-edge');
      }
      result.path.forEach(nid => cy.getElementById(nid)?.addClass('final-path-node'));
    });
  };

  const resetAll = () => {
    setStart(null);
    setEnd(null);
    setVisitedOrder([]);
    setVisitedEdges([]);
    setPath([]);
    setDistance(null);
    if (cy) {
      cy.elements().removeClass('visited-node visited-edge path-edge final-path-node start-node end-node');
      cy.fit(); // Re-centrar al resetear
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
      
      {/* AREA DEL GRAFO */}
      <div style={{ flex: 1, position: 'relative', backgroundColor: '#f9f9f9' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* SIDEBAR */}
      <div style={{
        width: '350px',
        backgroundColor: '#ffffff',
        boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#333' }}>Control de Rutas</h2>
        </div>

        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          
          {/* --- NUEVA SECCIÓN: CAMBIO DE ESCENARIO --- */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 10px 0', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', color: '#999' }}>Escenario</h4>
            <div style={{ display: 'flex', backgroundColor: '#f0f0f0', borderRadius: '8px', padding: '4px' }}>
              <button 
                onClick={() => setScenario('simple')}
                style={{
                  flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.9rem',
                  backgroundColor: scenario === 'simple' ? '#fff' : 'transparent',
                  color: scenario === 'simple' ? '#333' : '#777',
                  boxShadow: scenario === 'simple' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: scenario === 'simple' ? 'bold' : 'normal',
                  transition: 'all 0.2s'
                }}
              >
                Grafo Simple
              </button>
              <button 
                onClick={() => setScenario('advanced')}
                style={{
                  flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.9rem',
                  backgroundColor: scenario === 'advanced' ? '#fff' : 'transparent',
                  color: scenario === 'advanced' ? '#333' : '#777',
                  boxShadow: scenario === 'advanced' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: scenario === 'advanced' ? 'bold' : 'normal',
                  transition: 'all 0.2s'
                }}
              >
                Grafo Avanzado
              </button>
            </div>
          </div>
          {/* ------------------------------------------- */}

          <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '20px 0' }} />

          {/* SELECCIÓN NODOS */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 10px 0', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', color: '#999' }}>Selección</h4>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <div style={{ 
                flex: 1, padding: '10px', borderRadius: '8px', 
                backgroundColor: start ? '#E8F5E9' : '#f5f5f5', 
                border: start ? '1px solid #4CAF50' : '1px solid #eee'
              }}>
                <div style={{ fontSize: '0.8rem', color: start ? '#2E7D32' : '#aaa', fontWeight: 'bold' }}>INICIO</div>
                <div style={{ fontSize: '1.2rem', color: '#333' }}>{start || '-'}</div>
              </div>

              <div style={{ 
                flex: 1, padding: '10px', borderRadius: '8px', 
                backgroundColor: end ? '#FFEBEE' : '#f5f5f5',
                border: end ? '1px solid #F44336' : '1px solid #eee'
              }}>
                <div style={{ fontSize: '0.8rem', color: end ? '#C62828' : '#aaa', fontWeight: 'bold' }}>FIN</div>
                <div style={{ fontSize: '1.2rem', color: '#333' }}>{end || '-'}</div>
              </div>
            </div>
            <button onClick={resetAll} style={{ width: '100%', padding: '8px', border: 'none', background: 'transparent', color: '#666', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}>Reiniciar todo</button>
          </div>

          {/* ALGORITMO */}
          <div style={{ marginBottom: '24px' }}>
             <h4 style={{ margin: '0 0 10px 0', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', color: '#999' }}>Algoritmo</h4>
             <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
               <button onClick={() => setAlgo('dijkstra')} style={{ flex: 1, padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', border: algo === 'dijkstra' ? '2px solid #333' : '1px solid #ddd', background: algo === 'dijkstra' ? '#333' : '#fff', color: algo === 'dijkstra' ? '#fff' : '#333' }}>Dijkstra</button>
               <button onClick={() => setAlgo('astar')} style={{ flex: 1, padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', border: algo === 'astar' ? '2px solid #333' : '1px solid #ddd', background: algo === 'astar' ? '#333' : '#fff', color: algo === 'astar' ? '#fff' : '#333' }}>A*</button>
             </div>
             <button onClick={runAlgo} disabled={!start || !end} style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: (!start || !end) ? '#ccc' : '#007bff', color: '#fff', fontSize: '1rem', fontWeight: 'bold', cursor: (!start || !end) ? 'not-allowed' : 'pointer', boxShadow: (!start || !end) ? 'none' : '0 4px 6px rgba(0,123,255,0.3)', transition: 'all 0.2s' }}>Calcular Ruta</button>
          </div>

          {/* RESULTADOS */}
          {path.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ backgroundColor: '#f0f4f8', padding: '15px', borderRadius: '8px', border: '1px solid #d9e2ec' }}>
                <h3 style={{ marginTop: 0, color: '#102a43', fontSize: '1rem' }}>Ruta Óptima</h3>
                <div style={{ marginBottom: '5px' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#007bff' }}>{distance?.toFixed(2)}</span>
                  <span style={{ fontSize: '0.8rem', color: '#486581', marginLeft: 6 }}>unidades de costo</span>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: '1.4' }}>{path.join(' → ')}</div>
              </div>

              <div style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '8px', padding: '15px' }}>
                <h4 style={{ marginTop: 0, marginBottom: '10px', fontSize: '0.9rem', color: '#666' }}>Historial de Exploración (Paso a Paso)</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.85rem', color: '#444' }}>
                  {visitedEdges.length === 0 ? <p style={{ margin: 0, color: '#999' }}>Solo se visitaron nodos, sin expansiones.</p> : (
                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                      {visitedEdges.map(([u, v], index) => (
                        <li key={index} style={{ marginBottom: '4px' }}>
                          <span style={{ fontWeight: 'bold' }}>{u}</span> intentó ir a <span style={{ fontWeight: 'bold' }}>{v}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#888', borderTop: '1px solid #eee', paddingTop: '5px' }}>
                   Total pasos explorados: {visitedEdges.length}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};