/**
 * Graph Editor Data Model
 * 
 * This module defines a clean separation between:
 * 1. Graph Data (the actual content - nodes, edges, boundary nodes)
 * 2. View State (how you're looking at it - cwd, selections, pan/zoom)
 * 
 * Key concepts:
 * - Filesystem mental model: nodes are folders, boundary nodes define interfaces
 * - Process model: each tab/view is a "process" with its own cwd, selection, view state
 * - Single source of truth: boundary nodes ARE the interface definition
 * - Derived fields: inputs/outputs/props are computed from boundary nodes at runtime
 * 
 * Boundary Node Design (property-based):
 * - Boundary nodes have normal keys (e.g., 'input_a', 'output_result', 'prop_scale')
 * - The node's `type` property identifies it as a boundary node: 'graphInput', 'graphOutput', 'graphProp'
 * - The port/prop name is stored as a property: { name: 'portName', value: 'a' } or { name: 'propName', value: 'scale' }
 */

import type { Graph, Node, Edge, NodeDefinition, Port, PropDefinition } from '@fbp/types';

// =============================================================================
// GRAPH DATA (shared, single source of truth)
// =============================================================================

/**
 * The actual graph content - shared across all views/tabs.
 * This is what gets persisted to storage.
 */
export interface GraphData {
  /** The graph structure (nodes, edges, boundary nodes) */
  graph: Graph;
  /** Node type definitions (how nodes behave) */
  definitions: Map<string, NodeDefinition>;
}

// =============================================================================
// VIEW STATE (per-process/tab)
// =============================================================================

/**
 * 2D point for positions and offsets
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Camera/viewport state for the canvas
 */
export interface ViewState {
  pan: Point;
  zoom: number;
}

/**
 * What's currently selected in a view
 */
export interface SelectionState {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
}

/**
 * State for edge connection in progress
 */
export interface ConnectingState {
  active: boolean;
  sourceNode: string | null;
  sourcePort: string | null;
  isOutput: boolean;
}

/**
 * State for marquee/box selection in progress
 */
export interface BoxSelectState {
  active: boolean;
  start: Point | null;
  end: Point | null;
  previewNodeIds: Set<string>;
}

/**
 * Clipboard for copy/paste operations
 */
export interface ClipboardState {
  nodes: Node[];
  edges: Edge[];
}

/**
 * A "process" represents a single view/tab of the graph.
 * Each process has its own:
 * - CWD (current working directory / scope in the graph)
 * - Selection (what's selected in this view)
 * - View state (pan, zoom)
 * - Interaction state (connecting, box select)
 * 
 * Multiple processes can view the same graph at different scopes.
 */
export interface ViewProcess {
  /** Unique identifier for this process/tab */
  pid: string;
  /** Current working directory: "/" for root, "/subnet1" for nested */
  cwd: string;
  /** What's selected in this view */
  selection: SelectionState;
  /** Camera state (pan, zoom) */
  view: ViewState;
  /** Edge connection in progress */
  connecting: ConnectingState;
  /** Box selection in progress */
  boxSelect: BoxSelectState;
}

// =============================================================================
// COMBINED EDITOR STATE
// =============================================================================

/**
 * Complete editor state combining graph data and view processes.
 * 
 * - `data`: The actual graph content (shared across all tabs)
 * - `processes`: Per-tab view state (each tab can be at different scope)
 * - `activeProcessId`: Which tab is currently active (receives commands)
 * - `clipboard`: Shared clipboard for copy/paste
 */
export interface EditorState {
  /** Graph data (shared across all views) */
  data: GraphData;
  /** View processes (per-tab state) */
  processes: Map<string, ViewProcess>;
  /** Active process ID (which tab receives commands) */
  activeProcessId: string;
  /** Shared clipboard */
  clipboard: ClipboardState;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Boundary node type (input, output, or prop)
 */
export type BoundaryNodeType = 'input' | 'output' | 'prop';

/**
 * System type names for boundary nodes (detected via node.type)
 */
export const BOUNDARY_NODE_KINDS = {
  input: 'graphInput',
  output: 'graphOutput',
  prop: 'graphProp',
} as const;

/**
 * Check if a node is a boundary node by its type
 */
export function isBoundaryNode(node: { type: string }): boolean {
  return node.type === BOUNDARY_NODE_KINDS.input ||
         node.type === BOUNDARY_NODE_KINDS.output ||
         node.type === BOUNDARY_NODE_KINDS.prop;
}

/**
 * Check if a type string is a boundary node type
 */
export function isBoundaryNodeKind(type: string | undefined): boolean {
  return type === BOUNDARY_NODE_KINDS.input ||
         type === BOUNDARY_NODE_KINDS.output ||
         type === BOUNDARY_NODE_KINDS.prop;
}

/**
 * Get the boundary type from a node's type
 */
export function getBoundaryType(node: { type: string }): BoundaryNodeType | null {
  if (node.type === BOUNDARY_NODE_KINDS.input) return 'input';
  if (node.type === BOUNDARY_NODE_KINDS.output) return 'output';
  if (node.type === BOUNDARY_NODE_KINDS.prop) return 'prop';
  return null;
}

/**
 * Get the port/prop name from a boundary node's properties
 * Reads from 'portName' property for inputs/outputs, 'propName' for props
 */
export function getPortNameFromBoundary(node: { type: string; props?: Array<{ name: string; value?: unknown }> }): string | null {
  const boundaryType = getBoundaryType(node);
  if (!boundaryType) return null;
  
  const propName = boundaryType === 'prop' ? 'propName' : 'portName';
  const prop = node.props?.find(p => p.name === propName);
  return prop?.value as string | null;
}

/**
 * Get the data type from a boundary node's properties
 */
export function getDataTypeFromBoundary(node: { props?: Array<{ name: string; value?: unknown }> }): string {
  const prop = node.props?.find(p => p.name === 'dataType');
  return (prop?.value as string) || 'any';
}

/**
 * Get the default value from a boundary node's properties (for props)
 */
export function getDefaultFromBoundary(node: { props?: Array<{ name: string; value?: unknown }> }): unknown {
  const prop = node.props?.find(p => p.name === 'default');
  return prop?.value;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

/**
 * Create a default view state
 */
export function createDefaultViewState(): ViewState {
  return { pan: { x: 0, y: 0 }, zoom: 1 };
}

/**
 * Create a default selection state
 */
export function createDefaultSelectionState(): SelectionState {
  return { nodeIds: new Set(), edgeIds: new Set() };
}

/**
 * Create a default connecting state
 */
export function createDefaultConnectingState(): ConnectingState {
  return { active: false, sourceNode: null, sourcePort: null, isOutput: false };
}

/**
 * Create a default box select state
 */
export function createDefaultBoxSelectState(): BoxSelectState {
  return { active: false, start: null, end: null, previewNodeIds: new Set() };
}

/**
 * Create a new view process
 */
export function createViewProcess(pid: string, cwd: string = '/'): ViewProcess {
  return {
    pid,
    cwd,
    selection: createDefaultSelectionState(),
    view: createDefaultViewState(),
    connecting: createDefaultConnectingState(),
    boxSelect: createDefaultBoxSelectState(),
  };
}

/**
 * Create a default clipboard state
 */
export function createDefaultClipboardState(): ClipboardState {
  return { nodes: [], edges: [] };
}

/**
 * Create a default graph data
 */
export function createDefaultGraphData(): GraphData {
  return {
    graph: { name: 'untitled', nodes: [], edges: [] },
    definitions: new Map(),
  };
}

/**
 * Create a default editor state with a single process
 */
export function createDefaultEditorState(): EditorState {
  const defaultPid = 'main';
  return {
    data: createDefaultGraphData(),
    processes: new Map([[defaultPid, createViewProcess(defaultPid)]]),
    activeProcessId: defaultPid,
    clipboard: createDefaultClipboardState(),
  };
}
