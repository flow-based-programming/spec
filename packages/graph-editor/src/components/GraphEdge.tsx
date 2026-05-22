import React from 'react';
import { useGraph, useSelection, useScopedGraph } from '../context/GraphContext';
import { getNodePortPosition } from './GraphNode';
import { getBezierPath } from '../utils/geometry';
import type { Edge } from '@fbp/types';

interface GraphEdgeProps {
  edge: Edge;
}

export function GraphEdge({ edge }: GraphEdgeProps) {
  const { getDefinition } = useGraph();
  const { selection, selectEdges } = useSelection();
  const { nodes } = useScopedGraph();
  
  const edgeId = `${edge.src.node}:${edge.src.port}->${edge.dst.node}:${edge.dst.port}`;
  const isSelected = selection.edgeIds.has(edgeId);

  const srcNode = nodes.find(n => n.name === edge.src.node);
  const dstNode = nodes.find(n => n.name === edge.dst.node);
  
  if (!srcNode || !dstNode) return null;

  const srcDef = getDefinition(srcNode.type);
  const dstDef = getDefinition(dstNode.type);

  const srcPos = getNodePortPosition(srcNode, edge.src.port, true, srcDef);
  const dstPos = getNodePortPosition(dstNode, edge.dst.port, false, dstDef);

  if (!srcPos || !dstPos) return null;

  const path = getBezierPath(srcPos, dstPos);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectEdges([edgeId], e.shiftKey);
  };

  return (
    <g onClick={handleClick} style={{ cursor: 'pointer' }}>
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
      />
      <path
        d={path}
        fill="none"
        stroke={isSelected ? '#3b82f6' : '#64748b'}
        strokeWidth={isSelected ? 3 : 2}
        strokeLinecap="round"
      />
    </g>
  );
}

interface TempEdgeProps {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export function TempEdge({ start, end }: TempEdgeProps) {
  const path = getBezierPath(start, end);
  
  return (
    <path
      d={path}
      fill="none"
      stroke="#3b82f6"
      strokeWidth={2}
      strokeDasharray="8 4"
      strokeLinecap="round"
      pointerEvents="none"
    />
  );
}
