import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useGraph, useSelection, useNavigation, Point } from '../context/GraphContext';
import { GraphNode } from './GraphNode';
import { GraphEdge, TempEdge } from './GraphEdge';
import { screenToCanvas, clamp } from '../utils/geometry';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const GRID_SIZE = 20;

export function GraphCanvas() {
  const { state, dispatch } = useGraph();
  const { clearSelection, deleteSelection, duplicateSelection, selectAll } = useSelection();
  const { goUp, canGoUp, diveInto } = useNavigation();
  
  const svgRef = useRef<SVGSVGElement>(null);
  const bgRef = useRef<SVGRectElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [connectingEnd, setConnectingEnd] = useState<Point | null>(null);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // Use refs to access current state in native event handlers
  const viewRef = useRef(state.view);
  viewRef.current = state.view;

  // Native wheel handler to properly prevent browser zoom
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const view = viewRef.current;

      if (e.ctrlKey || e.metaKey) {
        const rect = svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = clamp(view.zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);

        const canvasPoint = screenToCanvas({ x: mouseX, y: mouseY }, view.pan, view.zoom);
        const newPanX = mouseX - canvasPoint.x * newZoom;
        const newPanY = mouseY - canvasPoint.y * newZoom;

        dispatch({ type: 'SET_VIEW', view: { zoom: newZoom, pan: { x: newPanX, y: newPanY } } });
      } else {
        dispatch({
          type: 'SET_VIEW',
          view: {
            pan: {
              x: view.pan.x - e.deltaX,
              y: view.pan.y - e.deltaY
            }
          }
        });
      }
    };

    // Prevent Safari gesture zoom
    const handleGesture = (e: Event) => {
      e.preventDefault();
    };

    // Add with passive: false to allow preventDefault
    svg.addEventListener('wheel', handleWheel, { passive: false });
    svg.addEventListener('gesturestart', handleGesture);
    svg.addEventListener('gesturechange', handleGesture);
    svg.addEventListener('gestureend', handleGesture);

    return () => {
      svg.removeEventListener('wheel', handleWheel);
      svg.removeEventListener('gesturestart', handleGesture);
      svg.removeEventListener('gesturechange', handleGesture);
      svg.removeEventListener('gestureend', handleGesture);
    };
  }, [dispatch]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only handle clicks on the canvas background (svg or background rect)
    const isCanvasClick = e.target === svgRef.current || e.target === bgRef.current;
    if (!isCanvasClick) return;
    
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: state.view.pan.x,
        panY: state.view.pan.y
      };
      return;
    }

    if (e.button === 0 && !e.shiftKey) {
      clearSelection();
    }

    if (e.button === 0 && e.shiftKey) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const canvasPoint = screenToCanvas(
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        state.view.pan,
        state.view.zoom
      );
      dispatch({ type: 'START_BOX_SELECT', start: canvasPoint });
    }
  }, [state.view, clearSelection, dispatch]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && panStart.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      dispatch({
        type: 'SET_VIEW',
        view: { pan: { x: panStart.current.panX + dx, y: panStart.current.panY + dy } }
      });
      return;
    }

    if (state.boxSelect.active) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const canvasPoint = screenToCanvas(
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        state.view.pan,
        state.view.zoom
      );
      dispatch({ type: 'UPDATE_BOX_SELECT', end: canvasPoint });
    }

    if (state.connecting.active) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const canvasPoint = screenToCanvas(
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        state.view.pan,
        state.view.zoom
      );
      setConnectingEnd(canvasPoint);
    }
  }, [isPanning, state.boxSelect.active, state.connecting.active, state.view, dispatch]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      panStart.current = null;
    }

    if (state.boxSelect.active) {
      dispatch({ type: 'END_BOX_SELECT' });
    }

    if (state.connecting.active) {
      dispatch({ type: 'CANCEL_CONNECTING' });
      setConnectingEnd(null);
    }
  }, [isPanning, state.boxSelect.active, state.connecting.active, dispatch]);

  const handleStartConnect = useCallback((
    nodeId: string,
    portName: string,
    isOutput: boolean,
    position: Point
  ) => {
    dispatch({ type: 'START_CONNECTING', nodeId, portName, isOutput });
    setConnectingEnd(position);
  }, [dispatch]);

  const handleEndConnect = useCallback((
    nodeId: string,
    portName: string,
    isOutput: boolean
  ) => {
    if (!state.connecting.active) return;
    if (state.connecting.isOutput === isOutput) return;
    if (state.connecting.sourceNode === nodeId) return;
    
    dispatch({ type: 'END_CONNECTING', nodeId, portName });
    setConnectingEnd(null);
  }, [state.connecting, dispatch]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        deleteSelection();
        break;
      case 'd':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          duplicateSelection();
        }
        break;
      case 'a':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          selectAll();
        }
        break;
      case 'Escape':
        clearSelection();
        if (state.connecting.active) {
          dispatch({ type: 'CANCEL_CONNECTING' });
          setConnectingEnd(null);
        }
        break;
      case 'u':
      case 'U':
        if (canGoUp) goUp();
        break;
      case 'Enter':
        const selectedNodes = Array.from(state.selection.nodeIds);
        if (selectedNodes.length === 1) {
          const node = state.graph.nodes.find(n => n.name === selectedNodes[0]);
          if (node?.nodes && node.nodes.length > 0) {
            diveInto(selectedNodes[0]);
          }
        }
        break;
    }
  }, [deleteSelection, duplicateSelection, selectAll, clearSelection, canGoUp, goUp, diveInto, state.selection.nodeIds, state.graph.nodes, state.connecting.active, dispatch]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getConnectingStartPos = (): Point | null => {
    if (!state.connecting.active || !state.connecting.sourceNode || !state.connecting.sourcePort) {
      return null;
    }
    const node = state.graph.nodes.find(n => n.name === state.connecting.sourceNode);
    if (!node) return null;
    
    const x = node.meta?.x || 0;
    const y = node.meta?.y || 0;
    const isOutput = state.connecting.isOutput;
    
    const definition = state.definitions.get(node.type);
    const ports = isOutput
      ? (node.outputs || definition?.outputs || [])
      : (node.inputs || definition?.inputs || []);
    
    const portIndex = ports.findIndex(p => p.name === state.connecting.sourcePort);
    if (portIndex === -1) return null;
    
    return {
      x: isOutput ? x + 180 : x,
      y: y + 28 + portIndex * 24 + 12
    };
  };

  const connectingStartPos = getConnectingStartPos();

  return (
    <svg
      ref={svgRef}
      className="w-full h-full bg-slate-950"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: isPanning ? 'grabbing' : 'default', userSelect: 'none', touchAction: 'none' }}
    >
      <defs>
        <pattern
          id="grid"
          width={GRID_SIZE}
          height={GRID_SIZE}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${state.view.pan.x % (GRID_SIZE * state.view.zoom)}, ${state.view.pan.y % (GRID_SIZE * state.view.zoom)}) scale(${state.view.zoom})`}
        >
          <circle cx={GRID_SIZE / 2} cy={GRID_SIZE / 2} r={1} fill="#334155" />
        </pattern>
      </defs>
      
      <rect ref={bgRef} width="100%" height="100%" fill="url(#grid)" />

      <g transform={`translate(${state.view.pan.x}, ${state.view.pan.y}) scale(${state.view.zoom})`}>
        {state.graph.edges.map((edge, i) => (
          <GraphEdge key={`${edge.src.node}:${edge.src.port}->${edge.dst.node}:${edge.dst.port}`} edge={edge} />
        ))}

        {connectingStartPos && connectingEnd && (
          <TempEdge start={connectingStartPos} end={connectingEnd} />
        )}

        {state.graph.nodes.map(node => (
          <GraphNode
            key={node.name}
            node={node}
            onStartConnect={handleStartConnect}
            onEndConnect={handleEndConnect}
          />
        ))}

        {state.boxSelect.active && state.boxSelect.start && state.boxSelect.end && (
          <rect
            x={Math.min(state.boxSelect.start.x, state.boxSelect.end.x)}
            y={Math.min(state.boxSelect.start.y, state.boxSelect.end.y)}
            width={Math.abs(state.boxSelect.end.x - state.boxSelect.start.x)}
            height={Math.abs(state.boxSelect.end.y - state.boxSelect.start.y)}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3b82f6"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
        )}
      </g>

      {state.navigationStack.length > 0 && (
        <g>
          <rect x={10} y={10} width={200} height={30} rx={4} fill="rgba(30, 41, 59, 0.9)" />
          <text x={20} y={30} fill="#94a3b8" fontSize={12} fontFamily="system-ui, sans-serif">
            {state.navigationStack.join(' / ')}
          </text>
          <text x={180} y={30} fill="#64748b" fontSize={10} fontFamily="system-ui, sans-serif">
            U to go up
          </text>
        </g>
      )}
    </svg>
  );
}
