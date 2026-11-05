import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { TableData } from '../types/schema';

const NODE_WIDTH = 320;

export function computeDagreLayout(
  nodes: Node<TableData>[],
  edges: Edge[],
  direction: 'LR' | 'TB' = 'LR'
): Node<TableData>[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, ranksep: 110, nodesep: 70, edgesep: 30 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    const height = 120 + node.data.columns.length * 34;
    g.setNode(node.id, { width: NODE_WIDTH, height });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const { x, y } = g.node(node.id);
    const height = 120 + node.data.columns.length * 34;
    return {
      ...node,
      position: {
        x: x - NODE_WIDTH / 2,
        y: y - height / 2,
      },
    };
  });
}

