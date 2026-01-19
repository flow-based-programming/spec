/**
 * Graph Editor Data Model
 * 
 * This module defines a clean separation between:
 * 1. Graph Data (the actual content - nodes, edges, boundary nodes)
 * 2. View State (how you're looking at it - cwd, selections, pan/zoom)
 * 
 * Key concepts:
 * - Filesystem mental model: nodes are folders, boundary nodes (@in:@out:@prop) define interfaces
 * - Process model: each tab/view is a "process" with its own cwd, selection, view state
 * - Single source of truth: boundary nodes ARE the interface definition
 * - Derived fields: inputs/outputs/props are computed from boundary nodes at runtime
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
 * Boundary node prefixes
 */
export const BOUNDARY_PREFIXES = {
  input: '@in:',
  output: '@out:',
  prop: '@prop:',
} as const;

/**
 * Check if a node name is a boundary node
 */
export function isBoundaryNode(name: string): boolean {
  return name.startsWith(BOUNDARY_PREFIXES.input) ||
         name.startsWith(BOUNDARY_PREFIXES.output) ||
         name.startsWith(BOUNDARY_PREFIXES.prop);
}

/**
 * Get the boundary type from a node name
 */
export function getBoundaryType(name: string): BoundaryNodeType | null {
  if (name.startsWith(BOUNDARY_PREFIXES.input)) return 'input';
  if (name.startsWith(BOUNDARY_PREFIXES.output)) return 'output';
  if (name.startsWith(BOUNDARY_PREFIXES.prop)) return 'prop';
  return null;
}

/**
 * Get the port name from a boundary node name
 * e.g., "@in:input1" -> "input1"
 */
export function getPortNameFromBoundary(name: string): string | null {
  const type = getBoundaryType(name);
  if (!type) return null;
  return name.slice(BOUNDARY_PREFIXES[type].length);
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
