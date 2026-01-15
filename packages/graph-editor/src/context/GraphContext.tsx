import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import type { Graph, Node, Edge, NodeDefinition, Prop } from '@fbp/types';

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

export interface GraphEditorState {
  graph: Graph;
  definitions: Map<string, NodeDefinition>;
  view: ViewState;
  selection: SelectionState;
  clipboard: ClipboardState;
  navigationStack: string[];
  currentScope: string | null;
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
  | { type: 'END_BOX_SELECT' };

function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getEdgeId(edge: Edge): string {
  return `${edge.src.node}:${edge.src.port}->${edge.dst.node}:${edge.dst.port}`;
}

function getNodesInScope(graph: Graph, scope: string | null): Node[] {
  if (!scope) return graph.nodes;
  
  const findNode = (nodes: Node[], path: string[]): Node | null => {
    if (path.length === 0) return null;
    const node = nodes.find(n => n.name === path[0]);
    if (!node) return null;
    if (path.length === 1) return node;
    return findNode(node.nodes || [], path.slice(1));
  };
  
  const scopePath = scope.split('/');
  const scopeNode = findNode(graph.nodes, scopePath);
  return scopeNode?.nodes || [];
}

function getEdgesInScope(graph: Graph, scope: string | null): Edge[] {
  if (!scope) return graph.edges;
  
  const findNode = (nodes: Node[], path: string[]): Node | null => {
    if (path.length === 0) return null;
    const node = nodes.find(n => n.name === path[0]);
    if (!node) return null;
    if (path.length === 1) return node;
    return findNode(node.nodes || [], path.slice(1));
  };
  
  const scopePath = scope.split('/');
  const scopeNode = findNode(graph.nodes, scopePath);
  return scopeNode?.edges || [];
}

function graphReducer(state: GraphEditorState, action: GraphAction): GraphEditorState {
  switch (action.type) {
    case 'SET_GRAPH':
      return {
        ...state,
        graph: action.graph,
        definitions: new Map([
          ...state.definitions,
          ...(action.graph.definitions || []).map(d => [d.type, d] as [string, NodeDefinition])
        ])
      };

    case 'SET_DEFINITIONS': {
      const newDefs = new Map(state.definitions);
      action.definitions.forEach(d => newDefs.set(d.type, d));
      return { ...state, definitions: newDefs };
    }

    case 'ADD_NODE': {
      const nodes = [...state.graph.nodes, action.node];
      return { ...state, graph: { ...state.graph, nodes } };
    }

    case 'ADD_BOUNDARY_NODE': {
      const { boundaryType, position } = action;
      const prefix = boundaryType === 'input' ? '@in/' : boundaryType === 'output' ? '@out/' : '@prop/';
      const baseName = boundaryType;
      const nodeType = `core/graph/${boundaryType}`;
      const kind = boundaryType === 'input' ? 'graphInput' : boundaryType === 'output' ? 'graphOutput' : 'graphProp';
      
      // Count existing boundary nodes of this type to generate next number
      const existingNodes = state.graph.nodes.filter(n => n.name.startsWith(prefix + baseName));
      const existingNumbers = existingNodes.map(n => {
        const match = n.name.match(new RegExp(`^${prefix}${baseName}(\\d+)$`));
        return match ? parseInt(match[1], 10) : 0;
      });
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const portName = `${baseName}${nextNumber}`;
      const nodeName = `${prefix}${portName}`;
      
      const newNode: Node = {
        name: nodeName,
        type: nodeType,
        kind: kind as 'graphInput' | 'graphOutput' | 'graphProp',
        meta: { x: position.x, y: position.y }
      };
      
      // Update graph interface arrays
      const newPort = { name: portName, type: 'any' };
      let inputs = state.graph.inputs || [];
      let outputs = state.graph.outputs || [];
      let props = state.graph.props || [];
      
      if (boundaryType === 'input') {
        inputs = [...inputs, newPort];
      } else if (boundaryType === 'output') {
        outputs = [...outputs, newPort];
      } else {
        props = [...props, { name: portName, type: 'any', default: undefined }];
      }
      
      return {
        ...state,
        graph: {
          ...state.graph,
          nodes: [...state.graph.nodes, newNode],
          inputs,
          outputs,
          props
        }
      };
    }

    case 'UPDATE_NODE': {
      const updateNodeInList = (nodes: Node[]): Node[] =>
        nodes.map(n => n.name === action.nodeId ? { ...n, ...action.updates } : n);
      return { ...state, graph: { ...state.graph, nodes: updateNodeInList(state.graph.nodes) } };
    }

    case 'DELETE_NODES': {
      const nodeIdSet = new Set(action.nodeIds);
      const nodes = state.graph.nodes.filter(n => !nodeIdSet.has(n.name));
      const edges = state.graph.edges.filter(
        e => !nodeIdSet.has(e.src.node) && !nodeIdSet.has(e.dst.node)
      );
      
      // Remove boundary node entries from graph.inputs/outputs/props
      const deletedNodes = state.graph.nodes.filter(n => nodeIdSet.has(n.name));
      const deletedInputNames = new Set(
        deletedNodes
          .filter(n => n.name.startsWith('@in/'))
          .map(n => n.name.replace('@in/', ''))
      );
      const deletedOutputNames = new Set(
        deletedNodes
          .filter(n => n.name.startsWith('@out/'))
          .map(n => n.name.replace('@out/', ''))
      );
      const deletedPropNames = new Set(
        deletedNodes
          .filter(n => n.name.startsWith('@prop/'))
          .map(n => n.name.replace('@prop/', ''))
      );
      
      const inputs = (state.graph.inputs || []).filter(p => !deletedInputNames.has(p.name));
      const outputs = (state.graph.outputs || []).filter(p => !deletedOutputNames.has(p.name));
      const props = (state.graph.props || []).filter(p => !deletedPropNames.has(p.name));
      
      return {
        ...state,
        graph: { ...state.graph, nodes, edges, inputs, outputs, props },
        selection: { nodeIds: new Set(), edgeIds: new Set() }
      };
    }

    case 'ADD_EDGE': {
      const edges = [...state.graph.edges, action.edge];
      return { ...state, graph: { ...state.graph, edges } };
    }

    case 'DELETE_EDGES': {
      const edgeIdSet = new Set(action.edgeIds);
      const edges = state.graph.edges.filter(e => !edgeIdSet.has(getEdgeId(e)));
      return {
        ...state,
        graph: { ...state.graph, edges },
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
      return { ...state, graph: { ...state.graph, nodes: updateProps(state.graph.nodes) } };
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
      const nodes = getNodesInScope(state.graph, state.currentScope);
      const edges = getEdgesInScope(state.graph, state.currentScope);
      return {
        ...state,
        selection: {
          nodeIds: new Set(nodes.map(n => n.name)),
          edgeIds: new Set(edges.map(getEdgeId))
        }
      };
    }

    case 'DUPLICATE_SELECTION': {
      const selectedNodes = state.graph.nodes.filter(n => state.selection.nodeIds.has(n.name));
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
      const duplicatedEdges = state.graph.edges
        .filter(e => state.selection.nodeIds.has(e.src.node) && state.selection.nodeIds.has(e.dst.node))
        .map(e => ({
          src: { node: nameMap.get(e.src.node) || e.src.node, port: e.src.port },
          dst: { node: nameMap.get(e.dst.node) || e.dst.node, port: e.dst.port }
        }));
      return {
        ...state,
        graph: {
          ...state.graph,
          nodes: [...state.graph.nodes, ...duplicatedNodes],
          edges: [...state.graph.edges, ...duplicatedEdges]
        },
        selection: { nodeIds: new Set(duplicatedNodes.map(n => n.name)), edgeIds: new Set() }
      };
    }

    case 'COPY_SELECTION': {
      const selectedNodes = state.graph.nodes.filter(n => state.selection.nodeIds.has(n.name));
      const selectedEdges = state.graph.edges.filter(
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
      return {
        ...state,
        graph: {
          ...state.graph,
          nodes: [...state.graph.nodes, ...pastedNodes],
          edges: [...state.graph.edges, ...pastedEdges]
        },
        selection: { nodeIds: new Set(pastedNodes.map(n => n.name)), edgeIds: new Set() }
      };
    }

    case 'COLLAPSE_SELECTION': {
      const selectedNodeIds = state.selection.nodeIds;
      if (selectedNodeIds.size < 1) return state;

      const selectedNodes = state.graph.nodes.filter(n => selectedNodeIds.has(n.name));
      
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
      
      state.graph.edges.forEach(edge => {
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

      // Find existing boundary nodes in selection
      const existingInputs = selectedNodes.filter(n => n.name.startsWith('@in/'));
      const existingOutputs = selectedNodes.filter(n => n.name.startsWith('@out/'));
      const existingProps = selectedNodes.filter(n => n.name.startsWith('@prop/'));

      // Create new boundary nodes for external connections
      const newInputNodes: Node[] = [];
      const newOutputNodes: Node[] = [];
      const newInternalEdges: Edge[] = [];
      const subnetExternalEdges: Edge[] = [];

      // Generate unique subnet name
      const existingSubnets = state.graph.nodes.filter(n => n.kind === 'subnet' || n.name.startsWith('subnet'));
      const subnetNumber = existingSubnets.length + 1;
      const subnetName = `subnet${subnetNumber}`;

      // Process incoming edges - create @in/ nodes
      let inputCounter = existingInputs.length + 1;
      const incomingPortMap = new Map<string, string>(); // "dstNode:dstPort" -> inputPortName
      
      incomingEdges.forEach(edge => {
        const key = `${edge.dst.node}:${edge.dst.port}`;
        if (!incomingPortMap.has(key)) {
          const inputName = `input${inputCounter++}`;
          const inputNodeName = `@in/${inputName}`;
          incomingPortMap.set(key, inputName);
          
          // Create @in/ node inside subnet
          newInputNodes.push({
            name: inputNodeName,
            type: 'core/graph/input',
            kind: 'graphInput',
            meta: { x: (edge.dst.node ? (selectedNodes.find(n => n.name === edge.dst.node)?.meta?.x || 0) - 150 : 0), y: selectedNodes.find(n => n.name === edge.dst.node)?.meta?.y || 0 }
          });
          
          // Create internal edge from @in/ to original destination
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

      // Process outgoing edges - create @out/ nodes
      let outputCounter = existingOutputs.length + 1;
      const outgoingPortMap = new Map<string, string>(); // "srcNode:srcPort" -> outputPortName
      
      outgoingEdges.forEach(edge => {
        const key = `${edge.src.node}:${edge.src.port}`;
        if (!outgoingPortMap.has(key)) {
          const outputName = `output${outputCounter++}`;
          const outputNodeName = `@out/${outputName}`;
          outgoingPortMap.set(key, outputName);
          
          // Create @out/ node inside subnet
          newOutputNodes.push({
            name: outputNodeName,
            type: 'core/graph/output',
            kind: 'graphOutput',
            meta: { x: (selectedNodes.find(n => n.name === edge.src.node)?.meta?.x || 0) + 150, y: selectedNodes.find(n => n.name === edge.src.node)?.meta?.y || 0 }
          });
          
          // Create internal edge from original source to @out/
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

      // Build subnet inputs/outputs/props from boundary nodes
      const subnetInputs = [
        ...existingInputs.map(n => ({ name: n.name.replace('@in/', ''), type: 'any' })),
        ...Array.from(incomingPortMap.values()).map(name => ({ name, type: 'any' }))
      ];
      const subnetOutputs = [
        ...existingOutputs.map(n => ({ name: n.name.replace('@out/', ''), type: 'any' })),
        ...Array.from(outgoingPortMap.values()).map(name => ({ name, type: 'any' }))
      ];
      const subnetProps = existingProps.map(n => ({ name: n.name.replace('@prop/', ''), type: 'any' }));

      // Create the subnet node
      const subnetNode: Node = {
        name: subnetName,
        type: 'subnet',
        kind: 'subnet',
        meta: { x: centerX, y: centerY },
        inputs: subnetInputs,
        outputs: subnetOutputs,
        props: subnetProps.map(p => ({ name: p.name, type: p.type, value: undefined as unknown })),
        nodes: [...selectedNodes, ...newInputNodes, ...newOutputNodes],
        edges: [...internalEdges, ...newInternalEdges]
      };

      // Remove selected nodes and their edges from main graph
      const remainingNodes = state.graph.nodes.filter(n => !selectedNodeIds.has(n.name));
      const remainingEdges = state.graph.edges.filter(e => 
        !selectedNodeIds.has(e.src.node) && !selectedNodeIds.has(e.dst.node)
      );

      return {
        ...state,
        graph: {
          ...state.graph,
          nodes: [...remainingNodes, subnetNode],
          edges: [...remainingEdges, ...subnetExternalEdges]
        },
        selection: { nodeIds: new Set([subnetName]), edgeIds: new Set() }
      };
    }

    case 'MOVE_NODES': {
      const nodeIdSet = new Set(action.nodeIds);
      const nodes = state.graph.nodes.map(n => {
        if (!nodeIdSet.has(n.name)) return n;
        return {
          ...n,
          meta: {
            ...n.meta,
            x: (n.meta?.x || 0) + action.delta.x,
            y: (n.meta?.y || 0) + action.delta.y
          }
        };
      });
      return { ...state, graph: { ...state.graph, nodes } };
    }

    case 'SET_VIEW':
      return { ...state, view: { ...state.view, ...action.view } };

    case 'DIVE_INTO': {
      const node = state.graph.nodes.find(n => n.name === action.nodeId);
      if (!node || !node.nodes) return state;
      const newScope = state.currentScope ? `${state.currentScope}/${action.nodeId}` : action.nodeId;
      return {
        ...state,
        currentScope: newScope,
        navigationStack: [...state.navigationStack, action.nodeId],
        selection: { nodeIds: new Set(), edgeIds: new Set() }
      };
    }

    case 'GO_UP': {
      if (state.navigationStack.length === 0) return state;
      const newStack = state.navigationStack.slice(0, -1);
      const newScope = newStack.length > 0 ? newStack.join('/') : null;
      return {
        ...state,
        currentScope: newScope,
        navigationStack: newStack,
        selection: { nodeIds: new Set(), edgeIds: new Set() }
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
      return {
        ...state,
        graph: { ...state.graph, edges: [...state.graph.edges, edge] },
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

      const minX = Math.min(start.x, end.x);
      const maxX = Math.max(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);

      const previewNodeIds = new Set(
        state.graph.nodes
          .filter(n => {
            const x = n.meta?.x || 0;
            const y = n.meta?.y || 0;
            return x >= minX && x <= maxX && y >= minY && y <= maxY;
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

      const minX = Math.min(newStart.x, newEnd.x);
      const maxX = Math.max(newStart.x, newEnd.x);
      const minY = Math.min(newStart.y, newEnd.y);
      const maxY = Math.max(newStart.y, newEnd.y);

      const previewNodeIds = new Set(
        state.graph.nodes
          .filter(n => {
            const x = n.meta?.x || 0;
            const y = n.meta?.y || 0;
            return x >= minX && x <= maxX && y >= minY && y <= maxY;
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

    default:
      return state;
  }
}

const initialState: GraphEditorState = {
  graph: { name: 'untitled', nodes: [], edges: [] },
  definitions: new Map(),
  view: { pan: { x: 0, y: 0 }, zoom: 1 },
  selection: { nodeIds: new Set(), edgeIds: new Set() },
  clipboard: { nodes: [], edges: [] },
  navigationStack: [],
  currentScope: null,
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

export function GraphProvider({ children, initialGraph, externalDefinitions, onSelectionChange }: {
  children: ReactNode;
  initialGraph?: Graph;
  externalDefinitions?: NodeDefinition[];
  onSelectionChange?: (selectedNodeIds: string[]) => void;
}) {
  const [state, dispatch] = useReducer(graphReducer, {
    ...initialState,
    graph: initialGraph || initialState.graph,
    definitions: new Map([
      ...(initialGraph?.definitions || []).map(d => [d.type, d] as [string, NodeDefinition]),
      ...(externalDefinitions || []).map(d => [d.type, d] as [string, NodeDefinition])
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
    deleteSelection: () => {
      dispatch({ type: 'DELETE_NODES', nodeIds: Array.from(state.selection.nodeIds) });
      dispatch({ type: 'DELETE_EDGES', edgeIds: Array.from(state.selection.edgeIds) });
    }
  };
}

export function useNavigation() {
  const { state, dispatch } = useGraph();
  return {
    currentScope: state.currentScope,
    navigationStack: state.navigationStack,
    diveInto: (nodeId: string) => dispatch({ type: 'DIVE_INTO', nodeId }),
    goUp: () => dispatch({ type: 'GO_UP' }),
    canGoUp: state.navigationStack.length > 0
  };
}
