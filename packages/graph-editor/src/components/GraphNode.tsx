import React, { useCallback, useRef, useState } from 'react';
import { useGraph, useSelection, useNavigation } from '../context/GraphContext';
import type { Node, Port } from '@fbp/types';
import { clsx } from 'clsx';

// Derive ports from boundary nodes inside a subnet (ensures ports are always in sync)
// Exported so GraphEdge can also use it for port position lookups
export function deriveBoundaryPorts(nodes: Node[], type: 'input' | 'output'): Port[] {
  const prefix = type === 'input' ? '@in/' : '@out/';
  return nodes
    .filter(n => n.name.startsWith(prefix))
    .map(n => {
      const portName = n.name.slice(prefix.length);
      // Get valueType from the boundary node's props if set
      const valueTypeProp = n.props?.find(p => p.name === 'valueType');
      const portType = (valueTypeProp?.value as string) || 'any';
      return { name: portName, type: portType };
    });
}

const NODE_WIDTH = 180;
const NODE_HEADER_HEIGHT = 28;
const PORT_HEIGHT = 24;
const PORT_RADIUS = 6;

interface GraphNodeProps {
  node: Node;
  onStartConnect: (nodeId: string, portName: string, isOutput: boolean, position: { x: number; y: number }) => void;
  onEndConnect?: (nodeId: string, portName: string, isOutput: boolean) => void;
}

export function GraphNode({ node, onStartConnect, onEndConnect }: GraphNodeProps) {
  const { state, dispatch, getDefinition, getShortName } = useGraph();
  const { selection, selectNodes } = useSelection();
  const { diveInto } = useNavigation();
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredPort, setHoveredPort] = useState<{ name: string; isOutput: boolean } | null>(null);
  const dragStart = useRef<{ x: number; y: number; nodeX: number; nodeY: number } | null>(null);

  const definition = getDefinition(node.type);
  const isSelected = selection.nodeIds.has(node.name);
  const isPreview = state.boxSelect.previewNodeIds.has(node.name);
  const isSubnet = node.nodes && node.nodes.length > 0;
  
  // For subnets, derive inputs/outputs from boundary nodes inside (always in sync)
  // For regular nodes, use node.inputs/outputs or fall back to definition
  const inputs = isSubnet 
    ? deriveBoundaryPorts(node.nodes || [], 'input')
    : (node.inputs || definition?.inputs || []);
  const outputs = isSubnet 
    ? deriveBoundaryPorts(node.nodes || [], 'output')
    : (node.outputs || definition?.outputs || []);
  const nodeHeight = NODE_HEADER_HEIGHT + Math.max(inputs.length, outputs.length, 1) * PORT_HEIGHT + 8;

  const x = node.meta?.x || 0;
  const y = node.meta?.y || 0;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    if (e.detail === 2 && isSubnet) {
      diveInto(node.name);
      return;
    }

    // Determine which nodes will be dragged BEFORE updating selection
    // This avoids race conditions with async state updates
    let nodesToDrag: string[];
    const additive = e.shiftKey;

    if (additive) {
      // Shift-click: add to existing selection, drag all
      nodesToDrag = [...Array.from(state.selection.nodeIds), node.name];
      selectNodes([node.name], true);
    } else if (isSelected) {
      // Already selected without shift: drag all currently selected
      nodesToDrag = Array.from(state.selection.nodeIds);
    } else {
      // Not selected, no shift: select only this node, drag only this node
      nodesToDrag = [node.name];
      selectNodes([node.name], false);
    }

    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, nodeX: x, nodeY: y };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = (moveEvent.clientX - dragStart.current.x) / state.view.zoom;
      const dy = (moveEvent.clientY - dragStart.current.y) / state.view.zoom;

      dispatch({
        type: 'MOVE_NODES',
        nodeIds: nodesToDrag,
        delta: { x: dx, y: dy }
      });
      dragStart.current = { ...dragStart.current, x: moveEvent.clientX, y: moveEvent.clientY };
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStart.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [node.name, isSelected, isSubnet, x, y, state.view.zoom, state.selection.nodeIds, selectNodes, diveInto, dispatch]);

  const handlePortMouseDown = useCallback((e: React.MouseEvent, portName: string, isOutput: boolean, portIndex: number) => {
    e.stopPropagation();
    const portY = y + NODE_HEADER_HEIGHT + portIndex * PORT_HEIGHT + PORT_HEIGHT / 2;
    const portX = isOutput ? x + NODE_WIDTH : x;
    onStartConnect(node.name, portName, isOutput, { x: portX, y: portY });
  }, [node.name, x, y, onStartConnect]);

  const handlePortMouseUp = useCallback((e: React.MouseEvent, portName: string, isOutput: boolean) => {
    e.stopPropagation();
    if (state.connecting.active && onEndConnect) {
      onEndConnect(node.name, portName, isOutput);
    }
  }, [node.name, state.connecting.active, onEndConnect]);

  const getPortColor = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'number': return '#4ade80';
      case 'string': return '#f472b6';
      case 'boolean': return '#facc15';
      case 'object': return '#60a5fa';
      case 'array': return '#a78bfa';
      default: return '#94a3b8';
    }
  };

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onMouseDown={handleMouseDown}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Background fill */}
      <rect
        width={NODE_WIDTH}
        height={nodeHeight}
        rx={8}
        ry={8}
        fill="#1e293b"
      />

      {/* Header background */}
      <rect
        width={NODE_WIDTH}
        height={NODE_HEADER_HEIGHT}
        rx={8}
        ry={8}
        fill={isSubnet ? '#7c3aed' : '#334155'}
      />
      <rect
        y={NODE_HEADER_HEIGHT - 8}
        width={NODE_WIDTH}
        height={8}
        fill={isSubnet ? '#7c3aed' : '#334155'}
      />

      {/* Border on top of everything */}
      <rect
        width={NODE_WIDTH}
        height={nodeHeight}
        rx={8}
        ry={8}
        fill="none"
        stroke={isSelected || isPreview ? '#3b82f6' : '#334155'}
        strokeWidth={isSelected || isPreview ? 2 : 1}
      />
      
      {definition?.icon && (
        <text
          x={10}
          y={NODE_HEADER_HEIGHT / 2 + 1}
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.7)"
          fontSize={11}
          fontFamily="system-ui, sans-serif"
        >
          {definition.icon}
        </text>
      )}
      <text
        x={NODE_WIDTH / 2}
        y={NODE_HEADER_HEIGHT / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={12}
        fontWeight={600}
        fontFamily="system-ui, sans-serif"
      >
        {getShortName(node.type)}
      </text>
      
      {isSubnet && (
        <text
          x={NODE_WIDTH - 8}
          y={NODE_HEADER_HEIGHT / 2 + 1}
          textAnchor="end"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.6)"
          fontSize={10}
          fontFamily="system-ui, sans-serif"
        >
          subnet
        </text>
      )}

      {inputs.map((port, i) => {
        const isValidDropTarget = state.connecting.active && state.connecting.isOutput && state.connecting.sourceNode !== node.name;
        const isHovered = hoveredPort?.name === port.name && hoveredPort?.isOutput === false;
        const highlight = isValidDropTarget && isHovered;
        return (
          <g key={`input-${port.name}`} transform={`translate(0, ${NODE_HEADER_HEIGHT + i * PORT_HEIGHT})`}>
            <circle
              cx={0}
              cy={PORT_HEIGHT / 2}
              r={PORT_RADIUS}
              fill={highlight ? '#60a5fa' : getPortColor(port.type)}
              stroke={highlight ? '#3b82f6' : '#1e293b'}
              strokeWidth={2}
              style={{ cursor: 'crosshair' }}
              onMouseDown={(e) => handlePortMouseDown(e, port.name, false, i)}
              onMouseUp={(e) => handlePortMouseUp(e, port.name, false)}
              onMouseEnter={() => setHoveredPort({ name: port.name, isOutput: false })}
              onMouseLeave={() => setHoveredPort(null)}
            />
            <text
              x={12}
              y={PORT_HEIGHT / 2}
              dominantBaseline="middle"
              fill="#94a3b8"
              fontSize={11}
              fontFamily="system-ui, sans-serif"
            >
              {port.name}
            </text>
          </g>
        );
      })}

      {outputs.map((port, i) => {
        const isValidDropTarget = state.connecting.active && !state.connecting.isOutput && state.connecting.sourceNode !== node.name;
        const isHovered = hoveredPort?.name === port.name && hoveredPort?.isOutput === true;
        const highlight = isValidDropTarget && isHovered;
        return (
          <g key={`output-${port.name}`} transform={`translate(0, ${NODE_HEADER_HEIGHT + i * PORT_HEIGHT})`}>
            <circle
              cx={NODE_WIDTH}
              cy={PORT_HEIGHT / 2}
              r={PORT_RADIUS}
              fill={highlight ? '#60a5fa' : getPortColor(port.type)}
              stroke={highlight ? '#3b82f6' : '#1e293b'}
              strokeWidth={2}
              style={{ cursor: 'crosshair' }}
              onMouseDown={(e) => handlePortMouseDown(e, port.name, true, i)}
              onMouseUp={(e) => handlePortMouseUp(e, port.name, true)}
              onMouseEnter={() => setHoveredPort({ name: port.name, isOutput: true })}
              onMouseLeave={() => setHoveredPort(null)}
            />
            <text
              x={NODE_WIDTH - 12}
              y={PORT_HEIGHT / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#94a3b8"
              fontSize={11}
              fontFamily="system-ui, sans-serif"
            >
              {port.name}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function getNodePortPosition(
  node: Node,
  portName: string,
  isOutput: boolean,
  definition?: { inputs?: Port[]; outputs?: Port[] }
): { x: number; y: number } | null {
  const x = node.meta?.x || 0;
  const y = node.meta?.y || 0;
  
  // For subnets, derive ports from boundary nodes inside (always in sync)
  const isSubnet = node.nodes && node.nodes.length > 0;
  const ports = isSubnet
    ? deriveBoundaryPorts(node.nodes || [], isOutput ? 'output' : 'input')
    : isOutput
      ? (node.outputs || definition?.outputs || [])
      : (node.inputs || definition?.inputs || []);
  
  const portIndex = ports.findIndex(p => p.name === portName);
  if (portIndex === -1) return null;
  
  return {
    x: isOutput ? x + NODE_WIDTH : x,
    y: y + NODE_HEADER_HEIGHT + portIndex * PORT_HEIGHT + PORT_HEIGHT / 2
  };
}

export { NODE_WIDTH, NODE_HEADER_HEIGHT, PORT_HEIGHT };
