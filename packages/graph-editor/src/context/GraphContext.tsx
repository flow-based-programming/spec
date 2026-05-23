import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import type { Graph, Node, Edge, NodeDefinition, Prop, Port } from '@fbp/types';
import {
  cwdToPath,
  isRootCwd,
  getParentCwd,
  getChildCwd,
  getNodesAtScope,
  getEdgesAtScope,
  updateNodesAtScope,
  updateEdgesAtScope,
  getEdgeId,
  ensureDerivedPorts,
  migrateLegacyGraph,
  deriveBoundaryPorts,
} from '../utils/graphTransform';
import { BOUNDARY_NODE_KINDS, isBoundaryNodeKind } from '../types';

// Built-in definitions for boundary node kinds
// These ensure graphInput/graphOutput/graphProp nodes render their ports
const BOUNDARY_NODE_DEFINITIONS: NodeDefinition[] = [
  {
    context: 'core',
    name: BOUNDARY_NODE_KINDS.input, // 'graphInput'
    category: 'graph',
    inputs: [],
    outputs: [{ name: 'value', type: 'any' }],
  },
  {
    context: 'core',
    name: BOUNDARY_NODE_KINDS.output, // 'graphOutput'
    category: 'graph',
    inputs: [{ name: 'value', type: 'any' }],
    outputs: [{ name: 'value', type: 'any' }],
  },
  {
    context: 'core',
    name: BOUNDARY_NODE_KINDS.prop, // 'graphProp'
    category: 'graph',
    inputs: [],
    outputs: [{ name: 'value', type: 'any' }],
  },
];

// Re-export getEdgeId for backward compatibility
export { getEdgeId } from '../utils/graphTransform';

// Node dimension constants (must match GraphNode.tsx)
const NODE_WIDTH = 180;
const NODE_HEADER_HEIGHT = 28;
const PORT_HEIGHT = 24;

// Helper to calculate node height based on number of ports
function getNodeHeight(node: Node, definition?: NodeDefinition): number {
  // For subnets, derive ports from boundary nodes (identified by type, not prefix)
  const isSubnet = node.nodes && node.nodes.length > 0;
  let inputCount = 0;
  let outputCount = 0;
  
  if (isSubnet) {
    inputCount = (node.nodes || []).filter(n => n.type === BOUNDARY_NODE_KINDS.input).length;
    outputCount = (node.nodes || []).filter(n => n.type === BOUNDARY_NODE_KINDS.output).length;
  } else {
    inputCount = (node.inputs || definition?.inputs || []).length;
    outputCount = (node.outputs || definition?.outputs || []).length;
  }
  
  return NODE_HEADER_HEIGHT + Math.max(inputCount, outputCount, 1) * PORT_HEIGHT + 8;
}

// Check if two rectangles overlap (any intersection counts)
function rectanglesOverlap(
  rect1: { minX: number; minY: number; maxX: number; maxY: number },
  rect2: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
  return rect1.maxX >= rect2.minX && rect1.minX <= rect2.maxX &&
         rect1.maxY >= rect2.minY && rect1.minY <= rect2.maxY;
}

export interface Point {
  x: number;
  y: number;
}

export interface ViewState {
  pan: Point;
  zoom: number;
}

export interface SelectionState {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
}

export interface ClipboardState {
  nodes: Node[];
  edges: Edge[];
}

// Per-scope state that persists when navigating between scopes
export interface ScopeState {
  selection: SelectionState;
  view: ViewState;
}

export interface GraphEditorState {
  graph: Graph;
  definitions: Map<string, NodeDefinition>;
  view: ViewState;
  selection: SelectionState;
  stateByPath: Map<string, ScopeState>; // Persist state per cwd path
  clipboard: ClipboardState;
  cwd: string; // Current working directory: "/" for root, "/subnet1" for nested
  connecting: {
    active: boolean;
    sourceNode: string | null;
    sourcePort: string | null;
    isOutput: boolean;
  };
  boxSelect: {
    active: boolean;
    start: Point | null;
    end: Point | null;
    previewNodeIds: Set<string>;
  };
}

type BoundaryNodeType = 'input' | 'output' | 'prop';

type GraphAction =
  | { type: 'SET_GRAPH'; graph: Graph }
  | { type: 'SET_DEFINITIONS'; definitions: NodeDefinition[] }
  | { type: 'ADD_NODE'; node: Node }
  | { type: 'ADD_BOUNDARY_NODE'; boundaryType: BoundaryNodeType; position: Point }
  | { type: 'UPDATE_NODE'; nodeId: string; updates: Partial<Node> }
  | { type: 'DELETE_NODES'; nodeIds: string[] }
  | { type: 'ADD_EDGE'; edge: Edge }
  | { type: 'DELETE_EDGES'; edgeIds: string[] }
  | { type: 'SET_NODE_PROP'; nodeId: string; propName: string; value: unknown }
  | { type: 'SELECT_NODES'; nodeIds: string[]; additive?: boolean }
  | { type: 'SELECT_EDGES'; edgeIds: string[]; additive?: boolean }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SELECT_ALL' }
  | { type: 'DUPLICATE_SELECTION' }
  | { type: 'COPY_SELECTION' }
  | { type: 'PASTE_SELECTION' }
  | { type: 'COLLAPSE_SELECTION' }
  | { type: 'LAYOUT_SELECTION' }
  | { type: 'MOVE_NODES'; nodeIds: string[]; delta: Point }
  | { type: 'SET_VIEW'; view: Partial<ViewState> }
  | { type: 'DIVE_INTO'; nodeId: string }
  | { type: 'GO_UP' }
  | { type: 'START_CONNECTING'; nodeId: string; portName: string; isOutput: boolean }
  | { type: 'END_CONNECTING'; nodeId: string; portName: string }
  | { type: 'CANCEL_CONNECTING' }
  | { type: 'START_BOX_SELECT'; start: Point }
  | { type: 'UPDATE_BOX_SELECT'; end: Point }
  | { type: 'MOVE_BOX_SELECT'; delta: Point }
  | { type: 'END_BOX_SELECT' }
  | { type: 'RENAME_NODE'; oldName: string; newName: string };

// generateId is kept locally as it's a simple utility
function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Auto-layout nodes in a layered/hierarchical arrangement
// Inputs on left, outputs on right, other nodes in layers based on dependency depth
function autoLayoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  const NODE_WIDTH = 180;
  const NODE_SPACING_X = 250;
  const NODE_SPACING_Y = 100;
  const START_X = 50;
  const START_Y = 50;

  // Separate nodes by type (boundary nodes identified by type property, not prefix)
  const inputNodes = nodes.filter(n => n.type === BOUNDARY_NODE_KINDS.input);
  const outputNodes = nodes.filter(n => n.type === BOUNDARY_NODE_KINDS.output);
  const propNodes = nodes.filter(n => n.type === BOUNDARY_NODE_KINDS.prop);
  const regularNodes = nodes.filter(n => !isBoundaryNodeKind(n.type));

  // Build adjacency map for regular nodes (who depends on whom)
  const nodeDepth = new Map<string, number>();
  const nodeSet = new Set(regularNodes.map(n => n.name));
  
  // Initialize all regular nodes with depth 0
  regularNodes.forEach(n => nodeDepth.set(n.name, 0));
  
  // Compute depth based on incoming edges (BFS-like approach)
  // Depth = max depth of all nodes that feed into this node + 1
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 100) {
    changed = false;
    iterations++;
    edges.forEach(edge => {
      if (nodeSet.has(edge.src.node) && nodeSet.has(edge.dst.node)) {
        const srcDepth = nodeDepth.get(edge.src.node) || 0;
        const dstDepth = nodeDepth.get(edge.dst.node) || 0;
        if (dstDepth <= srcDepth) {
          nodeDepth.set(edge.dst.node, srcDepth + 1);
          changed = true;
        }
      }
    });
  }

  // Group regular nodes by depth
  const layers = new Map<number, Node[]>();
  regularNodes.forEach(n => {
    const depth = nodeDepth.get(n.name) || 0;
    if (!layers.has(depth)) layers.set(depth, []);
    layers.get(depth)!.push(n);
  });

  // Calculate number of layers for positioning
  const maxDepth = Math.max(0, ...Array.from(layers.keys()));
  const totalLayers = maxDepth + 3; // +1 for inputs, +1 for outputs, +1 for props

  // Position input nodes (layer 0)
  const positionedInputs = inputNodes.map((n, i) => ({
    ...n,
    meta: { ...n.meta, x: START_X, y: START_Y + i * NODE_SPACING_Y }
  }));

  // Position prop nodes (below inputs)
  const positionedProps = propNodes.map((n, i) => ({
    ...n,
    meta: { ...n.meta, x: START_X, y: START_Y + (inputNodes.length + i) * NODE_SPACING_Y }
  }));

  // Position regular nodes by layer
  const positionedRegular: Node[] = [];
  for (let depth = 0; depth <= maxDepth; depth++) {
    const layerNodes = layers.get(depth) || [];
    layerNodes.forEach((n, i) => {
      positionedRegular.push({
        ...n,
        meta: { ...n.meta, x: START_X + (depth + 1) * NODE_SPACING_X, y: START_Y + i * NODE_SPACING_Y }
      });
    });
  }

  // Position output nodes (rightmost layer)
  const outputX = START_X + (maxDepth + 2) * NODE_SPACING_X;
  const positionedOutputs = outputNodes.map((n, i) => ({
    ...n,
    meta: { ...n.meta, x: outputX, y: START_Y + i * NODE_SPACING_Y }
  }));

  return [...positionedInputs, ...positionedProps, ...positionedRegular, ...positionedOutputs];
}

function graphReducer(state: GraphEditorState, action: GraphAction): GraphEditorState {
  switch (action.type) {
    case 'SET_GRAPH': {
      // Migrate legacy graphs and ensure derived ports
      const migratedGraph = migrateLegacyGraph(action.graph);
      return {
        ...state,
        graph: migratedGraph,
        definitions: new Map([
          ...BOUNDARY_NODE_DEFINITIONS.map(d => [d.name, d] as [string, NodeDefinition]),
          ...state.definitions,
          ...(migratedGraph.definitions || []).map(d => [d.name, d] as [string, NodeDefinition])
        ])
      };
    }

    case 'SET_DEFINITIONS': {
      const newDefs = new Map(state.definitions);
      action.definitions.forEach(d => newDefs.set(d.name, d));
      return { ...state, definitions: newDefs };
    }

    case 'ADD_NODE': {
      const newGraph = updateNodesAtScope(state.graph, state.cwd, nodes => [...nodes, action.node]);
      return { ...state, graph: newGraph };
    }

    case 'ADD_BOUNDARY_NODE': {
      const { boundaryType, position } = action;
      // Use type-based boundary node identification (not prefix-based)
      const nodeKind = BOUNDARY_NODE_KINDS[boundaryType];
      
      // Count existing boundary nodes of this kind to generate next number (scope-aware)
      const scopedNodes = getNodesAtScope(state.graph, state.cwd);
      const existingNodes = scopedNodes.filter(n => n.type === nodeKind);
      const existingNumbers = existingNodes.map(n => {
        const match = n.name.match(new RegExp(`^${boundaryType}_(\\d+)$`));
        return match ? parseInt(match[1], 10) : 0;
      });
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const portOrPropName = `${boundaryType}${nextNumber}`;
      const nodeName = `${boundaryType}_${nextNumber}`;
      
      // Create node with portName/propName as a property (not in the node name)
      const propName = boundaryType === 'prop' ? 'propName' : 'portName';
      const newNode: Node = {
        name: nodeName,
        type: nodeKind,
        meta: { x: position.x, y: position.y },
        props: [{ name: propName, type: 'string', value: portOrPropName }]
      };
      
      // Add node at current scope
      let newGraph = updateNodesAtScope(state.graph, state.cwd, nodes => [...nodes, newNode]);
      
      // Derive ports from boundary nodes (single source of truth)
      // This replaces the old dual-sync logic - ports are now always derived
      newGraph = ensureDerivedPorts(newGraph);
      
      return { ...state, graph: newGraph };
    }

    case 'UPDATE_NODE': {
      const updateNodeInList = (nodes: Node[]): Node[] =>
        nodes.map(n => n.name === action.nodeId ? { ...n, ...action.updates } : n);
      const newGraph = updateNodesAtScope(state.graph, state.cwd, updateNodeInList);
      return { ...state, graph: newGraph };
    }

    case 'DELETE_NODES': {
      const nodeIdSet = new Set(action.nodeIds);
      
      // Delete nodes at current scope
      let newGraph = updateNodesAtScope(state.graph, state.cwd, 
        nodes => nodes.filter(n => !nodeIdSet.has(n.name))
      );
      
      // Delete edges that reference deleted nodes at current scope
      newGraph = updateEdgesAtScope(newGraph, state.cwd,
        edges => edges.filter(e => !nodeIdSet.has(e.src.node) && !nodeIdSet.has(e.dst.node))
      );
      
      // Derive ports from remaining boundary nodes (single source of truth)
      // This replaces the old dual-sync logic - ports are now always derived
      newGraph = ensureDerivedPorts(newGraph);
      
      return {
        ...state,
        graph: newGraph,
        selection: { nodeIds: new Set(), edgeIds: new Set() }
      };
    }

    case 'ADD_EDGE': {
      const newGraph = updateEdgesAtScope(state.graph, state.cwd, edges => [...edges, action.edge]);
      return { ...state, graph: newGraph };
    }

    case 'DELETE_EDGES': {
      const edgeIdSet = new Set(action.edgeIds);
      const newGraph = updateEdgesAtScope(state.graph, state.cwd, 
        edges => edges.filter(e => !edgeIdSet.has(getEdgeId(e)))
      );
      return {
        ...state,
        graph: newGraph,
        selection: { ...state.selection, edgeIds: new Set() }
      };
    }

    case 'SET_NODE_PROP': {
      const updateProps = (nodes: Node[]): Node[] =>
        nodes.map(n => {
          if (n.name !== action.nodeId) return n;
          const props = n.props || [];
          const existingIdx = props.findIndex(p => p.name === action.propName);
          const newProp: Prop = { name: action.propName, type: typeof action.value as string, value: action.value };
          const newProps = existingIdx >= 0
            ? props.map((p, i) => i === existingIdx ? newProp : p)
            : [...props, newProp];
          return { ...n, props: newProps };
        });
      const newGraph = updateNodesAtScope(state.graph, state.cwd, updateProps);
      return { ...state, graph: newGraph };
    }

    case 'SELECT_NODES': {
      const newNodeSelection = action.additive
        ? new Set([...state.selection.nodeIds, ...action.nodeIds])
        : new Set(action.nodeIds);
      // Clear edge selection when selecting nodes (unless additive)
      const newEdgeSelection = action.additive ? state.selection.edgeIds : new Set<string>();
      return { ...state, selection: { nodeIds: newNodeSelection, edgeIds: newEdgeSelection } };
    }

    case 'SELECT_EDGES': {
      const newEdgeSelection = action.additive
        ? new Set([...state.selection.edgeIds, ...action.edgeIds])
        : new Set(action.edgeIds);
      // Clear node selection when selecting edges (unless additive)
      const newNodeSelection = action.additive ? state.selection.nodeIds : new Set<string>();
      return { ...state, selection: { nodeIds: newNodeSelection, edgeIds: newEdgeSelection } };
    }

    case 'CLEAR_SELECTION':
      return { ...state, selection: { nodeIds: new Set(), edgeIds: new Set() } };

    case 'SELECT_ALL': {
      const nodes = getNodesAtScope(state.graph, state.cwd);
      const edges = getEdgesAtScope(state.graph, state.cwd);
      return {
        ...state,
        selection: {
          nodeIds: new Set(nodes.map(n => n.name)),
          edgeIds: new Set(edges.map(getEdgeId))
        }
      };
    }

    case 'DUPLICATE_SELECTION': {
      const scopedNodes = getNodesAtScope(state.graph, state.cwd);
      const scopedEdges = getEdgesAtScope(state.graph, state.cwd);
      const selectedNodes = scopedNodes.filter(n => state.selection.nodeIds.has(n.name));
      const nameMap = new Map<string, string>();
      const duplicatedNodes = selectedNodes.map(n => {
        const newName = `${n.name}_copy_${Date.now().toString(36)}`;
        nameMap.set(n.name, newName);
        return {
          ...n,
          name: newName,
          meta: n.meta ? { ...n.meta, x: (n.meta.x || 0) + 50, y: (n.meta.y || 0) + 50 } : { x: 50, y: 50 }
        };
      });
      const duplicatedEdges = scopedEdges
        .filter(e => state.selection.nodeIds.has(e.src.node) && state.selection.nodeIds.has(e.dst.node))
        .map(e => ({
          src: { node: nameMap.get(e.src.node) || e.src.node, port: e.src.port },
          dst: { node: nameMap.get(e.dst.node) || e.dst.node, port: e.dst.port }
        }));
      
      let newGraph = updateNodesAtScope(state.graph, state.cwd, nodes => [...nodes, ...duplicatedNodes]);
      newGraph = updateEdgesAtScope(newGraph, state.cwd, edges => [...edges, ...duplicatedEdges]);
      
      return {
        ...state,
        graph: newGraph,
        selection: { nodeIds: new Set(duplicatedNodes.map(n => n.name)), edgeIds: new Set() }
      };
    }

    case 'COPY_SELECTION': {
      const scopedNodes = getNodesAtScope(state.graph, state.cwd);
      const scopedEdges = getEdgesAtScope(state.graph, state.cwd);
      const selectedNodes = scopedNodes.filter(n => state.selection.nodeIds.has(n.name));
      const selectedEdges = scopedEdges.filter(
        e => state.selection.nodeIds.has(e.src.node) && state.selection.nodeIds.has(e.dst.node)
      );
      return {
        ...state,
        clipboard: {
          nodes: selectedNodes.map(n => ({ ...n })),
          edges: selectedEdges.map(e => ({ ...e }))
        }
      };
    }

    case 'PASTE_SELECTION': {
      if (state.clipboard.nodes.length === 0) return state;
      
      const nameMap = new Map<string, string>();
      const pastedNodes = state.clipboard.nodes.map(n => {
        const newName = `${n.name}_copy_${Date.now().toString(36)}`;
        nameMap.set(n.name, newName);
        return {
          ...n,
          name: newName,
          meta: n.meta ? { ...n.meta, x: (n.meta.x || 0) + 50, y: (n.meta.y || 0) + 50 } : { x: 50, y: 50 }
        };
      });
      const pastedEdges = state.clipboard.edges.map(e => ({
        src: { node: nameMap.get(e.src.node) || e.src.node, port: e.src.port },
        dst: { node: nameMap.get(e.dst.node) || e.dst.node, port: e.dst.port }
      }));
      
      let newGraph = updateNodesAtScope(state.graph, state.cwd, nodes => [...nodes, ...pastedNodes]);
      newGraph = updateEdgesAtScope(newGraph, state.cwd, edges => [...edges, ...pastedEdges]);
      
      return {
        ...state,
        graph: newGraph,
        selection: { nodeIds: new Set(pastedNodes.map(n => n.name)), edgeIds: new Set() }
      };
    }

    case 'COLLAPSE_SELECTION': {
      const selectedNodeIds = state.selection.nodeIds;
      if (selectedNodeIds.size < 1) return state;

      const scopedNodes = getNodesAtScope(state.graph, state.cwd);
      const scopedEdges = getEdgesAtScope(state.graph, state.cwd);
      const selectedNodes = scopedNodes.filter(n => selectedNodeIds.has(n.name));
      
      // Calculate center position for the subnet node
      let sumX = 0, sumY = 0;
      selectedNodes.forEach(n => {
        sumX += n.meta?.x || 0;
        sumY += n.meta?.y || 0;
      });
      const centerX = sumX / selectedNodes.length;
      const centerY = sumY / selectedNodes.length;

      // Categorize edges
      const internalEdges: Edge[] = [];
      const incomingEdges: Edge[] = []; // External -> Selected
      const outgoingEdges: Edge[] = []; // Selected -> External
      
      scopedEdges.forEach(edge => {
        const srcSelected = selectedNodeIds.has(edge.src.node);
        const dstSelected = selectedNodeIds.has(edge.dst.node);
        
        if (srcSelected && dstSelected) {
          internalEdges.push(edge);
        } else if (!srcSelected && dstSelected) {
          incomingEdges.push(edge);
        } else if (srcSelected && !dstSelected) {
          outgoingEdges.push(edge);
        }
      });

      // Find existing boundary nodes in selection (identified by type, not prefix)
      const existingInputs = selectedNodes.filter(n => n.type === BOUNDARY_NODE_KINDS.input);
      const existingOutputs = selectedNodes.filter(n => n.type === BOUNDARY_NODE_KINDS.output);
      const existingProps = selectedNodes.filter(n => n.type === BOUNDARY_NODE_KINDS.prop);

      // Create new boundary nodes for external connections
      const newInputNodes: Node[] = [];
      const newOutputNodes: Node[] = [];
      const newInternalEdges: Edge[] = [];
      const subnetExternalEdges: Edge[] = [];

      // Generate unique subnet name
      const existingSubnets = scopedNodes.filter(n => n.type === 'subnet' || n.name.startsWith('subnet'));
      const subnetNumber = existingSubnets.length + 1;
      const subnetName = `subnet${subnetNumber}`;

      // Process incoming edges - create graphInput nodes (property-based naming)
      let inputCounter = existingInputs.length + 1;
      const incomingPortMap = new Map<string, string>(); // "dstNode:dstPort" -> inputPortName
      
      incomingEdges.forEach(edge => {
        const key = `${edge.dst.node}:${edge.dst.port}`;
        if (!incomingPortMap.has(key)) {
          const inputPortName = `input${inputCounter}`;
          const inputNodeName = `input_${inputCounter++}`;
          incomingPortMap.set(key, inputPortName);
          
          // Create graphInput node inside subnet (with portName as property)
          newInputNodes.push({
            name: inputNodeName,
            type: BOUNDARY_NODE_KINDS.input,
            meta: { x: (edge.dst.node ? (selectedNodes.find(n => n.name === edge.dst.node)?.meta?.x || 0) - 150 : 0), y: selectedNodes.find(n => n.name === edge.dst.node)?.meta?.y || 0 },
            props: [{ name: 'portName', type: 'string', value: inputPortName }]
          });
          
          // Create internal edge from graphInput to original destination
          newInternalEdges.push({
            src: { node: inputNodeName, port: 'value' },
            dst: { node: edge.dst.node, port: edge.dst.port }
          });
        }
        
        // Create external edge from original source to subnet input
        const inputPortName = incomingPortMap.get(key)!;
        subnetExternalEdges.push({
          src: { node: edge.src.node, port: edge.src.port },
          dst: { node: subnetName, port: inputPortName }
        });
      });

      // Process outgoing edges - create graphOutput nodes (property-based naming)
      let outputCounter = existingOutputs.length + 1;
      const outgoingPortMap = new Map<string, string>(); // "srcNode:srcPort" -> outputPortName
      
      outgoingEdges.forEach(edge => {
        const key = `${edge.src.node}:${edge.src.port}`;
        if (!outgoingPortMap.has(key)) {
          const outputPortName = `output${outputCounter}`;
          const outputNodeName = `output_${outputCounter++}`;
          outgoingPortMap.set(key, outputPortName);
          
          // Create graphOutput node inside subnet (with portName as property)
          newOutputNodes.push({
            name: outputNodeName,
            type: BOUNDARY_NODE_KINDS.output,
            meta: { x: (selectedNodes.find(n => n.name === edge.src.node)?.meta?.x || 0) + 150, y: selectedNodes.find(n => n.name === edge.src.node)?.meta?.y || 0 },
            props: [{ name: 'portName', type: 'string', value: outputPortName }]
          });
          
          // Create internal edge from original source to graphOutput
          newInternalEdges.push({
            src: { node: edge.src.node, port: edge.src.port },
            dst: { node: outputNodeName, port: 'value' }
          });
        }
        
        // Create external edge from subnet output to original destination
        const outputPortName = outgoingPortMap.get(key)!;
        subnetExternalEdges.push({
          src: { node: subnetName, port: outputPortName },
          dst: { node: edge.dst.node, port: edge.dst.port }
        });
      });

      // Build subnet inputs/outputs/props from boundary nodes (read portName/propName from properties)
      const getPortName = (n: Node): string => {
        const prop = n.props?.find(p => p.name === 'portName');
        return (prop?.value as string) || n.name;
      };
      const getPropName = (n: Node): string => {
        const prop = n.props?.find(p => p.name === 'propName');
        return (prop?.value as string) || n.name;
      };
      const subnetInputs = [
        ...existingInputs.map(n => ({ name: getPortName(n), type: 'any' })),
        ...Array.from(incomingPortMap.values()).map(name => ({ name, type: 'any' }))
      ];
      const subnetOutputs = [
        ...existingOutputs.map(n => ({ name: getPortName(n), type: 'any' })),
        ...Array.from(outgoingPortMap.values()).map(name => ({ name, type: 'any' }))
      ];
      const subnetProps = existingProps.map(n => ({ name: getPropName(n), type: 'any' }));

      // Collect all nodes for the subnet and apply autolayout
      const allSubnetNodes = [...selectedNodes, ...newInputNodes, ...newOutputNodes];
      const allSubnetEdges = [...internalEdges, ...newInternalEdges];
      const layoutedNodes = autoLayoutNodes(allSubnetNodes, allSubnetEdges);

      // Create the subnet node
      const subnetNode: Node = {
        name: subnetName,
        type: 'subnet',
        meta: { x: centerX, y: centerY },
        inputs: subnetInputs,
        outputs: subnetOutputs,
        props: subnetProps.map(p => ({ name: p.name, type: p.type, value: undefined as unknown })),
        nodes: layoutedNodes,
        edges: allSubnetEdges
      };

      // Remove selected nodes and their edges from current scope, add subnet node
      let newGraph = updateNodesAtScope(state.graph, state.cwd, nodes => {
        const remaining = nodes.filter(n => !selectedNodeIds.has(n.name));
        return [...remaining, subnetNode];
      });
      newGraph = updateEdgesAtScope(newGraph, state.cwd, edges => {
        const remaining = edges.filter(e => 
          !selectedNodeIds.has(e.src.node) && !selectedNodeIds.has(e.dst.node)
        );
        return [...remaining, ...subnetExternalEdges];
      });

      return {
        ...state,
        graph: newGraph,
        selection: { nodeIds: new Set([subnetName]), edgeIds: new Set() }
      };
    }

    case 'LAYOUT_SELECTION': {
      const selectedNodeIds = state.selection.nodeIds;
      if (selectedNodeIds.size < 1) return state;

      const scopedNodes = getNodesAtScope(state.graph, state.cwd);
      const scopedEdges = getEdgesAtScope(state.graph, state.cwd);
      const selectedNodes = scopedNodes.filter(n => selectedNodeIds.has(n.name));
      
      // Get edges that connect selected nodes (for layout algorithm)
      const selectedEdges = scopedEdges.filter(e => 
        selectedNodeIds.has(e.src.node) && selectedNodeIds.has(e.dst.node)
      );
      
      // Apply autolayout to selected nodes
      const layoutedNodes = autoLayoutNodes(selectedNodes, selectedEdges);
      
      // Create a map of new positions
      const newPositions = new Map<string, { x: number; y: number }>();
      layoutedNodes.forEach(n => {
        newPositions.set(n.name, { x: n.meta?.x || 0, y: n.meta?.y || 0 });
      });
      
      // Update nodes at current scope with new positions
      const newGraph = updateNodesAtScope(state.graph, state.cwd, nodes =>
        nodes.map(n => {
          const newPos = newPositions.get(n.name);
          if (!newPos) return n;
          return { ...n, meta: { ...n.meta, x: newPos.x, y: newPos.y } };
        })
      );
      
      return { ...state, graph: newGraph };
    }

    case 'MOVE_NODES': {
      const nodeIdSet = new Set(action.nodeIds);
      const newGraph = updateNodesAtScope(state.graph, state.cwd, nodes =>
        nodes.map(n => {
          if (!nodeIdSet.has(n.name)) return n;
          return {
            ...n,
            meta: {
              ...n.meta,
              x: (n.meta?.x || 0) + action.delta.x,
              y: (n.meta?.y || 0) + action.delta.y
            }
          };
        })
      );
      return { ...state, graph: newGraph };
    }

    case 'SET_VIEW':
      return { ...state, view: { ...state.view, ...action.view } };

    case 'DIVE_INTO': {
      const scopedNodes = getNodesAtScope(state.graph, state.cwd);
      const node = scopedNodes.find(n => n.name === action.nodeId);
      if (!node || !node.nodes) return state;
      
      // Calculate new cwd: "/" + nodeId or currentCwd + "/" + nodeId
      const newCwd = isRootCwd(state.cwd) ? `/${action.nodeId}` : `${state.cwd}/${action.nodeId}`;
      
      // Save current state for this path
      const newStateByPath = new Map(state.stateByPath);
      newStateByPath.set(state.cwd, { selection: state.selection, view: state.view });
      
      // Restore state for the new path if it exists, otherwise use defaults
      const restoredState = state.stateByPath.get(newCwd);
      const newSelection = restoredState?.selection || { nodeIds: new Set<string>(), edgeIds: new Set<string>() };
      const newView = restoredState?.view || { pan: { x: 0, y: 0 }, zoom: 1 };
      
      return {
        ...state,
        cwd: newCwd,
        selection: newSelection,
        view: newView,
        stateByPath: newStateByPath
      };
    }

    case 'GO_UP': {
      // Can't go up from root
      if (isRootCwd(state.cwd)) return state;
      
      // Calculate parent cwd: "/subnet1/subnet2" -> "/subnet1", "/subnet1" -> "/"
      const pathSegments = cwdToPath(state.cwd);
      pathSegments.pop();
      const newCwd = pathSegments.length === 0 ? '/' : '/' + pathSegments.join('/');
      
      // Save current state for this path
      const newStateByPath = new Map(state.stateByPath);
      newStateByPath.set(state.cwd, { selection: state.selection, view: state.view });
      
      // Restore state for the parent path if it exists, otherwise use defaults
      const restoredState = state.stateByPath.get(newCwd);
      const newSelection = restoredState?.selection || { nodeIds: new Set<string>(), edgeIds: new Set<string>() };
      const newView = restoredState?.view || { pan: { x: 0, y: 0 }, zoom: 1 };
      
      return {
        ...state,
        cwd: newCwd,
        selection: newSelection,
        view: newView,
        stateByPath: newStateByPath
      };
    }

    case 'START_CONNECTING':
      return {
        ...state,
        connecting: {
          active: true,
          sourceNode: action.nodeId,
          sourcePort: action.portName,
          isOutput: action.isOutput
        }
      };

    case 'END_CONNECTING': {
      if (!state.connecting.active || !state.connecting.sourceNode || !state.connecting.sourcePort) {
        return { ...state, connecting: { active: false, sourceNode: null, sourcePort: null, isOutput: false } };
      }
      const edge: Edge = state.connecting.isOutput
        ? {
            src: { node: state.connecting.sourceNode, port: state.connecting.sourcePort },
            dst: { node: action.nodeId, port: action.portName }
          }
        : {
            src: { node: action.nodeId, port: action.portName },
            dst: { node: state.connecting.sourceNode, port: state.connecting.sourcePort }
          };
      const newGraph = updateEdgesAtScope(state.graph, state.cwd, edges => [...edges, edge]);
      return {
        ...state,
        graph: newGraph,
        connecting: { active: false, sourceNode: null, sourcePort: null, isOutput: false }
      };
    }

    case 'CANCEL_CONNECTING':
      return { ...state, connecting: { active: false, sourceNode: null, sourcePort: null, isOutput: false } };

    case 'START_BOX_SELECT':
      return { ...state, boxSelect: { active: true, start: action.start, end: action.start, previewNodeIds: new Set() } };

    case 'UPDATE_BOX_SELECT': {
      const start = state.boxSelect.start;
      const end = action.end;
      if (!start) return state;

      // Marquee bounding box
      const marqueeRect = {
        minX: Math.min(start.x, end.x),
        maxX: Math.max(start.x, end.x),
        minY: Math.min(start.y, end.y),
        maxY: Math.max(start.y, end.y)
      };

      const scopedNodes = getNodesAtScope(state.graph, state.cwd);
      const previewNodeIds = new Set(
        scopedNodes
          .filter(n => {
            const nodeX = n.meta?.x || 0;
            const nodeY = n.meta?.y || 0;
            const definition = state.definitions.get(n.type);
            const nodeHeight = getNodeHeight(n, definition);
            
            // Node bounding box
            const nodeRect = {
              minX: nodeX,
              maxX: nodeX + NODE_WIDTH,
              minY: nodeY,
              maxY: nodeY + nodeHeight
            };
            
            // Select if marquee overlaps with node (any touch counts)
            return rectanglesOverlap(marqueeRect, nodeRect);
          })
          .map(n => n.name)
      );

      return { ...state, boxSelect: { ...state.boxSelect, end, previewNodeIds } };
    }

    case 'MOVE_BOX_SELECT': {
      const { start, end } = state.boxSelect;
      if (!start || !end) return state;

      const newStart = { x: start.x + action.delta.x, y: start.y + action.delta.y };
      const newEnd = { x: end.x + action.delta.x, y: end.y + action.delta.y };

      // Marquee bounding box
      const marqueeRect = {
        minX: Math.min(newStart.x, newEnd.x),
        maxX: Math.max(newStart.x, newEnd.x),
        minY: Math.min(newStart.y, newEnd.y),
        maxY: Math.max(newStart.y, newEnd.y)
      };

      const scopedNodes = getNodesAtScope(state.graph, state.cwd);
      const previewNodeIds = new Set(
        scopedNodes
          .filter(n => {
            const nodeX = n.meta?.x || 0;
            const nodeY = n.meta?.y || 0;
            const definition = state.definitions.get(n.type);
            const nodeHeight = getNodeHeight(n, definition);
            
            // Node bounding box
            const nodeRect = {
              minX: nodeX,
              maxX: nodeX + NODE_WIDTH,
              minY: nodeY,
              maxY: nodeY + nodeHeight
            };
            
            // Select if marquee overlaps with node (any touch counts)
            return rectanglesOverlap(marqueeRect, nodeRect);
          })
          .map(n => n.name)
      );

      return { ...state, boxSelect: { ...state.boxSelect, start: newStart, end: newEnd, previewNodeIds } };
    }

    case 'END_BOX_SELECT': {
      // Use the already-calculated preview nodes for selection
      const previewNodeIds = state.boxSelect.previewNodeIds;

      return {
        ...state,
        boxSelect: { active: false, start: null, end: null, previewNodeIds: new Set() },
        selection: { ...state.selection, nodeIds: previewNodeIds }
      };
    }

    case 'RENAME_NODE': {
      const { oldName, newName } = action;
      if (oldName === newName) return state;
      
      // Check if new name already exists in current scope
      const scopedNodes = getNodesAtScope(state.graph, state.cwd);
      if (scopedNodes.some(n => n.name === newName)) {
        console.warn(`Node with name "${newName}" already exists`);
        return state;
      }
      
      // Update node name
      let newGraph = updateNodesAtScope(state.graph, state.cwd, nodes =>
        nodes.map(n => n.name === oldName ? { ...n, name: newName } : n)
      );
      
      // Update edges that reference this node
      newGraph = updateEdgesAtScope(newGraph, state.cwd, edges =>
        edges.map(e => ({
          ...e,
          src: e.src.node === oldName ? { ...e.src, node: newName } : e.src,
          dst: e.dst.node === oldName ? { ...e.dst, node: newName } : e.dst
        }))
      );
      
      // Derive ports from boundary nodes (single source of truth)
      // This replaces the old dual-sync logic - ports are now always derived
      newGraph = ensureDerivedPorts(newGraph);
      
      // Update selection if the renamed node was selected
      const newSelection = state.selection.nodeIds.has(oldName)
        ? {
            ...state.selection,
            nodeIds: new Set([...state.selection.nodeIds].map(id => id === oldName ? newName : id))
          }
        : state.selection;
      
      return { ...state, graph: newGraph, selection: newSelection };
    }

    default:
      return state;
  }
}

const initialState: GraphEditorState = {
  graph: { name: 'untitled', nodes: [], edges: [] },
  definitions: new Map(),
  view: { pan: { x: 0, y: 0 }, zoom: 1 },
  selection: { nodeIds: new Set(), edgeIds: new Set() },
  stateByPath: new Map(),
  clipboard: { nodes: [], edges: [] },
  cwd: '/',
  connecting: { active: false, sourceNode: null, sourcePort: null, isOutput: false },
  boxSelect: { active: false, start: null, end: null, previewNodeIds: new Set() }
};

interface GraphContextValue {
  state: GraphEditorState;
  dispatch: React.Dispatch<GraphAction>;
  getDefinition: (type: string) => NodeDefinition | undefined;
  getShortName: (type: string) => string;
  isChannelReference: (value: unknown) => boolean;
}

const GraphContext = createContext<GraphContextValue | null>(null);

export function GraphProvider({ children, initialGraph, initialCwd, externalDefinitions, onSelectionChange }: {
  children: ReactNode;
  initialGraph?: Graph;
  initialCwd?: string;
  externalDefinitions?: NodeDefinition[];
  onSelectionChange?: (selectedNodeIds: string[]) => void;
}) {
  // Migrate legacy graphs on initialization to ensure boundary nodes are the source of truth
  const migratedInitialGraph = initialGraph ? migrateLegacyGraph(initialGraph) : initialState.graph;
  
  const [state, dispatch] = useReducer(graphReducer, {
    ...initialState,
    graph: migratedInitialGraph,
    cwd: initialCwd || '/',
    definitions: new Map([
      ...BOUNDARY_NODE_DEFINITIONS.map(d => [d.name, d] as [string, NodeDefinition]),
      ...(migratedInitialGraph.definitions || []).map(d => [d.name, d] as [string, NodeDefinition]),
      ...(externalDefinitions || []).map(d => [d.name, d] as [string, NodeDefinition])
    ])
  });

  // Call onSelectionChange when selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(Array.from(state.selection.nodeIds));
    }
  }, [state.selection.nodeIds, onSelectionChange]);

  const getDefinition = useCallback((type: string) => state.definitions.get(type), [state.definitions]);
  
  const getShortName = useCallback((type: string) => {
    const parts = type.split('/');
    return parts[parts.length - 1];
  }, []);

  const isChannelReference = useCallback((value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    return value.startsWith('ch(') || value.startsWith('$');
  }, []);

  return (
    <GraphContext.Provider value={{ state, dispatch, getDefinition, getShortName, isChannelReference }}>
      {children}
    </GraphContext.Provider>
  );
}

export function useGraph() {
  const context = useContext(GraphContext);
  if (!context) throw new Error('useGraph must be used within a GraphProvider');
  return context;
}

export function useSelection() {
  const { state, dispatch } = useGraph();
  return {
    selection: state.selection,
    selectNodes: (nodeIds: string[], additive = false) => dispatch({ type: 'SELECT_NODES', nodeIds, additive }),
    selectEdges: (edgeIds: string[], additive = false) => dispatch({ type: 'SELECT_EDGES', edgeIds, additive }),
    clearSelection: () => dispatch({ type: 'CLEAR_SELECTION' }),
    selectAll: () => dispatch({ type: 'SELECT_ALL' }),
    duplicateSelection: () => dispatch({ type: 'DUPLICATE_SELECTION' }),
    copySelection: () => dispatch({ type: 'COPY_SELECTION' }),
    pasteSelection: () => dispatch({ type: 'PASTE_SELECTION' }),
    collapseSelection: () => dispatch({ type: 'COLLAPSE_SELECTION' }),
    layoutSelection: () => dispatch({ type: 'LAYOUT_SELECTION' }),
    deleteSelection: () => {
      dispatch({ type: 'DELETE_NODES', nodeIds: Array.from(state.selection.nodeIds) });
      dispatch({ type: 'DELETE_EDGES', edgeIds: Array.from(state.selection.edgeIds) });
    }
  };
}

export function useNavigation() {
  const { state, dispatch } = useGraph();
  // Derive navigationStack from cwd: "/" -> [], "/subnet1" -> ["subnet1"], "/subnet1/subnet2" -> ["subnet1", "subnet2"]
  const navigationStack = cwdToPath(state.cwd);
  return {
    cwd: state.cwd,
    currentScope: state.cwd, // Alias for backwards compatibility
    navigationStack,
    diveInto: (nodeId: string) => dispatch({ type: 'DIVE_INTO', nodeId }),
    goUp: () => dispatch({ type: 'GO_UP' }),
    canGoUp: !isRootCwd(state.cwd)
  };
}

export function useScopedGraph() {
  const { state } = useGraph();
  const nodes = getNodesAtScope(state.graph, state.cwd);
  const edges = getEdgesAtScope(state.graph, state.cwd);
  return { nodes, edges };
}
