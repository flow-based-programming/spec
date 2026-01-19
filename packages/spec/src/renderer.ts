/**
 * @fbp/spec - Renderer Types
 * 
 * These types extend the storage types with DERIVED data and RUNTIME state.
 * Used by the graph editor UI for rendering and interaction.
 * 
 * Key principle: Everything here is either:
 * 1. Derived from storage data (e.g., ports from boundary nodes)
 * 2. Ephemeral runtime state (e.g., selection, view position)
 */

import type {
  Node,
  Graph,
  Edge,
  PortDef,
  PropDef,
  NodeDefinition,
  NodeMeta,
} from './types';

// =============================================================================
// DERIVED NODE/GRAPH TYPES
// =============================================================================

/**
 * A node with derived port information.
 * For subnet nodes, inputs/outputs are derived from boundary nodes.
 */
export interface RuntimeNode extends Node {
  /** Derived from @in: boundary nodes (for subnets) */
  inputs?: PortDef[];
  /** Derived from @out: boundary nodes (for subnets) */
  outputs?: PortDef[];
  /** Derived from @prop: boundary nodes (for subnets) */
  props?: PropDef[];
  /** Child nodes with derived data */
  nodes?: RuntimeNode[];
}

/**
 * A graph with derived port information.
 * Inputs/outputs/props are derived from root-level boundary nodes.
 */
export interface RuntimeGraph extends Omit<Graph, 'nodes'> {
  /** Derived from @in: boundary nodes */
  inputs?: PortDef[];
  /** Derived from @out: boundary nodes */
  outputs?: PortDef[];
  /** Derived from @prop: boundary nodes */
  props?: PropDef[];
  /** Nodes with derived data */
  nodes: RuntimeNode[];
}

// =============================================================================
// VIEW STATE
// =============================================================================

/**
 * Camera/viewport state for the canvas.
 */
export interface ViewState {
  /** Pan offset */
  pan: { x: number; y: number };
  /** Zoom level (1.0 = 100%) */
  zoom: number;
}

/**
 * Current selection state.
 */
export interface SelectionState {
  /** Selected node names */
  nodeIds: Set<string>;
  /** Selected edge identifiers */
  edgeIds: Set<string>;
}

/**
 * State for edge creation (dragging from a port).
 */
export interface ConnectingState {
  active: boolean;
  sourceNode?: string;
  sourcePort?: string;
  sourceIsOutput?: boolean;
  mousePosition?: { x: number; y: number };
}

/**
 * State for marquee/box selection.
 */
export interface BoxSelectState {
  active: boolean;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  previewNodeIds?: Set<string>;
}

/**
 * Clipboard for copy/paste operations.
 */
export interface ClipboardState {
  nodes: Node[];
  edges: Edge[];
  /** Source cwd when copied (for relative positioning) */
  sourceCwd?: string;
}

// =============================================================================
// EDITOR STATE
// =============================================================================

/**
 * Complete editor state for a single view/tab.
 * 
 * Note: In a multi-tab scenario, each tab would have its own:
 * - cwd (current working directory / scope)
 * - view (pan/zoom)
 * - selection
 * 
 * But share the same:
 * - graph data
 * - definitions
 * - clipboard
 */
export interface EditorState {
  /** The graph with derived port data */
  graph: RuntimeGraph;
  /** Node definitions (type -> definition) */
  definitions: Map<string, NodeDefinition>;
  /** Current scope path (e.g., "/", "/subnet1", "/subnet1/nested") */
  cwd: string;
  /** Viewport state */
  view: ViewState;
  /** Selection state */
  selection: SelectionState;
  /** Edge creation state */
  connecting: ConnectingState;
  /** Box selection state */
  boxSelect: BoxSelectState;
  /** Clipboard */
  clipboard: ClipboardState;
}

// =============================================================================
// MULTI-TAB / PROCESS MODEL (Future)
// =============================================================================

/**
 * A "process" represents a single view/tab of the graph.
 * Multiple processes can view the same graph at different scopes.
 */
export interface ViewProcess {
  /** Unique process identifier */
  pid: string;
  /** Current working directory (scope path) */
  cwd: string;
  /** Viewport state for this process */
  view: ViewState;
  /** Selection state for this process */
  selection: SelectionState;
  /** Edge creation state */
  connecting: ConnectingState;
  /** Box selection state */
  boxSelect: BoxSelectState;
}

/**
 * Shared graph data across all processes.
 */
export interface GraphData {
  /** The graph with derived port data */
  graph: RuntimeGraph;
  /** Node definitions */
  definitions: Map<string, NodeDefinition>;
}

/**
 * Multi-tab editor state.
 * Separates shared graph data from per-tab view state.
 */
export interface MultiTabEditorState {
  /** Shared graph data */
  data: GraphData;
  /** Per-tab processes */
  processes: Map<string, ViewProcess>;
  /** Currently active process */
  activeProcessId: string;
  /** Shared clipboard */
  clipboard: ClipboardState;
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

export type {
  Node,
  Graph,
  Edge,
  PortRef,
  PortDef,
  PropDef,
  PropValue,
  NodeDefinition,
  NodeMeta,
  DefinitionLibrary,
} from './types';
