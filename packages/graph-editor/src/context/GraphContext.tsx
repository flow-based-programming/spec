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

export interface GraphEditorState {
  graph: Graph;
  definitions: Map<string, NodeDefinition>;
  view: ViewState;
  selection: SelectionState;
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

type GraphAction =
  | { type: 'SET_GRAPH'; graph: Graph }
  | { type: 'SET_DEFINITIONS'; definitions: NodeDefinition[] }
  | { type: 'ADD_NODE'; node: Node }
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
      return {
        ...state,
        graph: { ...state.graph, nodes, edges },
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

export function GraphProvider({ children, initialGraph, externalDefinitions }: {
  children: ReactNode;
  initialGraph?: Graph;
  externalDefinitions?: NodeDefinition[];
}) {
  const [state, dispatch] = useReducer(graphReducer, {
    ...initialState,
    graph: initialGraph || initialState.graph,
    definitions: new Map([
      ...(initialGraph?.definitions || []).map(d => [d.type, d] as [string, NodeDefinition]),
      ...(externalDefinitions || []).map(d => [d.type, d] as [string, NodeDefinition])
    ])
  });

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
