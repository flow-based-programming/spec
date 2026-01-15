/**
 * Graph Transformation Utilities
 * 
 * Handles conversion between storage format and runtime format.
 * 
 * Storage format: Boundary nodes (@in/@out/@prop) ARE the interface definition.
 *                 No redundant inputs/outputs/props arrays.
 * 
 * Runtime format: inputs/outputs/props are DERIVED from boundary nodes.
 *                 This is what the editor works with.
 * 
 * The transformation ensures:
 * - Single source of truth (boundary nodes)
 * - No sync issues between boundary nodes and port arrays
 * - Backward compatibility with legacy graphs
 */

import type { Graph, Node, Edge, Port, PropDefinition } from '@fbp/types';
import { BOUNDARY_PREFIXES, getPortNameFromBoundary, getBoundaryType } from '../types';

// =============================================================================
// DERIVE PORTS FROM BOUNDARY NODES
// =============================================================================

/**
 * Derive input/output ports from boundary nodes in a node list.
 * This is the single source of truth for port definitions.
 * 
 * @param nodes - List of nodes (may include @in/@out/@prop boundary nodes)
 * @param type - Which type of ports to derive ('input' or 'output')
 * @returns Array of Port definitions derived from boundary nodes
 */
export function deriveBoundaryPorts(nodes: Node[], type: 'input' | 'output'): Port[] {
  const prefix = type === 'input' ? BOUNDARY_PREFIXES.input : BOUNDARY_PREFIXES.output;
  
  return nodes
    .filter(n => n.name.startsWith(prefix))
    .map(n => {
      const portName = n.name.slice(prefix.length);
      // Get valueType from the boundary node's props if set
      const valueTypeProp = n.props?.find(p => p.name === 'valueType');
      const portType = (valueTypeProp?.value as string) || 'any';
      return { name: portName, type: portType };
    })
    .sort((a, b) => a.name.localeCompare(b.name)); // Stable ordering
}

/**
 * Derive prop definitions from @prop/ boundary nodes.
 * 
 * @param nodes - List of nodes (may include @prop/ boundary nodes)
 * @returns Array of PropDefinition derived from boundary nodes
 */
export function deriveBoundaryProps(nodes: Node[]): PropDefinition[] {
  const prefix = BOUNDARY_PREFIXES.prop;
  
  return nodes
    .filter(n => n.name.startsWith(prefix))
    .map(n => {
      const propName = n.name.slice(prefix.length);
      const valueTypeProp = n.props?.find(p => p.name === 'valueType');
      const defaultProp = n.props?.find(p => p.name === 'default');
      return {
        name: propName,
        type: (valueTypeProp?.value as string) || 'any',
        default: defaultProp?.value,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name)); // Stable ordering
}

// =============================================================================
// SCOPE NAVIGATION HELPERS
// =============================================================================

/**
 * Convert cwd string to path segments.
 * "/" -> []
 * "/subnet1" -> ["subnet1"]
 * "/subnet1/subnet2" -> ["subnet1", "subnet2"]
 */
export function cwdToPath(cwd: string): string[] {
  return cwd.split('/').filter(Boolean);
}

/**
 * Check if cwd is at root level
 */
export function isRootCwd(cwd: string): boolean {
  return cwd === '/';
}

/**
 * Get the parent cwd from a cwd path.
 * "/subnet1/subnet2" -> "/subnet1"
 * "/subnet1" -> "/"
 * "/" -> "/" (can't go above root)
 */
export function getParentCwd(cwd: string): string {
  if (isRootCwd(cwd)) return '/';
  const segments = cwdToPath(cwd);
  segments.pop();
  return segments.length === 0 ? '/' : '/' + segments.join('/');
}

/**
 * Get child cwd by appending a node name.
 * "/", "subnet1" -> "/subnet1"
 * "/subnet1", "subnet2" -> "/subnet1/subnet2"
 */
export function getChildCwd(cwd: string, nodeName: string): string {
  return isRootCwd(cwd) ? `/${nodeName}` : `${cwd}/${nodeName}`;
}

// =============================================================================
// SCOPE-AWARE GRAPH ACCESS
// =============================================================================

/**
 * Get nodes at a specific scope (cwd) in the graph.
 */
export function getNodesAtScope(graph: Graph, cwd: string): Node[] {
  if (isRootCwd(cwd)) return graph.nodes;
  
  const path = cwdToPath(cwd);
  let nodes = graph.nodes;
  
  for (const segment of path) {
    const node = nodes.find(n => n.name === segment);
    if (!node || !node.nodes) return [];
    nodes = node.nodes;
  }
  
  return nodes;
}

/**
 * Get edges at a specific scope (cwd) in the graph.
 */
export function getEdgesAtScope(graph: Graph, cwd: string): Edge[] {
  if (isRootCwd(cwd)) return graph.edges;
  
  const path = cwdToPath(cwd);
  let currentNode: Node | undefined;
  let nodes = graph.nodes;
  
  for (const segment of path) {
    currentNode = nodes.find(n => n.name === segment);
    if (!currentNode) return [];
    nodes = currentNode.nodes || [];
  }
  
  return currentNode?.edges || [];
}

/**
 * Find a node at a specific path in the graph.
 */
export function findNodeAtPath(graph: Graph, path: string[]): Node | null {
  if (path.length === 0) return null;
  
  let nodes = graph.nodes;
  let node: Node | undefined;
  
  for (const segment of path) {
    node = nodes.find(n => n.name === segment);
    if (!node) return null;
    nodes = node.nodes || [];
  }
  
  return node || null;
}

// =============================================================================
// SCOPE-AWARE GRAPH UPDATES
// =============================================================================

/**
 * Update nodes at a specific scope in the graph.
 * Returns a new graph with the updated nodes.
 */
export function updateNodesAtScope(
  graph: Graph,
  cwd: string,
  updater: (nodes: Node[]) => Node[]
): Graph {
  if (isRootCwd(cwd)) {
    return { ...graph, nodes: updater(graph.nodes) };
  }
  
  const path = cwdToPath(cwd);
  
  const updateRecursive = (nodes: Node[], remainingPath: string[]): Node[] => {
    if (remainingPath.length === 0) return updater(nodes);
    
    const [current, ...rest] = remainingPath;
    return nodes.map(n => {
      if (n.name !== current) return n;
      return {
        ...n,
        nodes: updateRecursive(n.nodes || [], rest)
      };
    });
  };
  
  return { ...graph, nodes: updateRecursive(graph.nodes, path) };
}

/**
 * Update edges at a specific scope in the graph.
 * Returns a new graph with the updated edges.
 */
export function updateEdgesAtScope(
  graph: Graph,
  cwd: string,
  updater: (edges: Edge[]) => Edge[]
): Graph {
  if (isRootCwd(cwd)) {
    return { ...graph, edges: updater(graph.edges) };
  }
  
  const path = cwdToPath(cwd);
  
  const updateRecursive = (nodes: Node[], remainingPath: string[]): Node[] => {
    if (remainingPath.length === 0) return nodes;
    
    const [current, ...rest] = remainingPath;
    return nodes.map(n => {
      if (n.name !== current) return n;
      if (rest.length === 0) {
        return { ...n, edges: updater(n.edges || []) };
      }
      return {
        ...n,
        nodes: updateRecursive(n.nodes || [], rest)
      };
    });
  };
  
  return { ...graph, nodes: updateRecursive(graph.nodes, path) };
}

// =============================================================================
// RUNTIME TRANSFORMATION
// =============================================================================

/**
 * Ensure a graph has derived inputs/outputs/props from boundary nodes.
 * This is called when loading a graph to ensure runtime format.
 * 
 * For the root graph and all subnets, this:
 * 1. Derives inputs from @in/ boundary nodes
 * 2. Derives outputs from @out/ boundary nodes
 * 3. Derives props from @prop/ boundary nodes
 */
export function ensureDerivedPorts(graph: Graph): Graph {
  // Derive root-level ports from boundary nodes
  const derivedInputs = deriveBoundaryPorts(graph.nodes, 'input');
  const derivedOutputs = deriveBoundaryPorts(graph.nodes, 'output');
  const derivedProps = deriveBoundaryProps(graph.nodes);
  
  // Recursively process subnets
  const processedNodes = graph.nodes.map(node => ensureDerivedPortsOnNode(node));
  
  return {
    ...graph,
    inputs: derivedInputs,
    outputs: derivedOutputs,
    props: derivedProps,
    nodes: processedNodes,
  };
}

/**
 * Ensure a node (potentially a subnet) has derived ports.
 */
function ensureDerivedPortsOnNode(node: Node): Node {
  // If not a subnet, return as-is
  if (!node.nodes || node.nodes.length === 0) {
    return node;
  }
  
  // Derive ports from boundary nodes inside the subnet
  const derivedInputs = deriveBoundaryPorts(node.nodes, 'input');
  const derivedOutputs = deriveBoundaryPorts(node.nodes, 'output');
  
  // Recursively process nested subnets
  const processedNodes = node.nodes.map(n => ensureDerivedPortsOnNode(n));
  
  return {
    ...node,
    inputs: derivedInputs,
    outputs: derivedOutputs,
    nodes: processedNodes,
  };
}

// =============================================================================
// LEGACY MIGRATION
// =============================================================================

/**
 * Migrate a legacy graph that has inputs/outputs/props but no boundary nodes.
 * This generates the boundary nodes from the port arrays.
 * 
 * After migration, the boundary nodes become the source of truth.
 */
export function migrateLegacyGraph(graph: Graph): Graph {
  // Check if we need to migrate (has ports but no boundary nodes)
  const hasBoundaryNodes = graph.nodes.some(n => 
    n.name.startsWith(BOUNDARY_PREFIXES.input) ||
    n.name.startsWith(BOUNDARY_PREFIXES.output) ||
    n.name.startsWith(BOUNDARY_PREFIXES.prop)
  );
  
  if (hasBoundaryNodes) {
    // Already has boundary nodes, just ensure derived ports
    return ensureDerivedPorts(graph);
  }
  
  // Generate boundary nodes from inputs/outputs/props
  const boundaryNodes: Node[] = [];
  
  // Generate @in/ nodes from inputs
  (graph.inputs || []).forEach((port, i) => {
    boundaryNodes.push({
      name: `${BOUNDARY_PREFIXES.input}${port.name}`,
      type: 'core/graph/input',
      kind: 'graphInput',
      meta: { x: 50, y: 50 + i * 100 },
      props: port.type !== 'any' ? [{ name: 'valueType', type: 'string', value: port.type }] : [],
    });
  });
  
  // Generate @out/ nodes from outputs
  (graph.outputs || []).forEach((port, i) => {
    boundaryNodes.push({
      name: `${BOUNDARY_PREFIXES.output}${port.name}`,
      type: 'core/graph/output',
      kind: 'graphOutput',
      meta: { x: 500, y: 50 + i * 100 },
      props: port.type !== 'any' ? [{ name: 'valueType', type: 'string', value: port.type }] : [],
    });
  });
  
  // Generate @prop/ nodes from props
  (graph.props || []).forEach((prop, i) => {
    const propNodes: { name: string; type: string; value: unknown }[] = [];
    if (prop.type !== 'any') {
      propNodes.push({ name: 'valueType', type: 'string', value: prop.type });
    }
    if (prop.default !== undefined) {
      propNodes.push({ name: 'default', type: prop.type, value: prop.default });
    }
    boundaryNodes.push({
      name: `${BOUNDARY_PREFIXES.prop}${prop.name}`,
      type: 'core/graph/prop',
      kind: 'graphProp',
      meta: { x: 50, y: 50 + (graph.inputs?.length || 0) * 100 + i * 100 },
      props: propNodes,
    });
  });
  
  // Recursively migrate subnets
  const migratedNodes = graph.nodes.map(node => migrateLegacyNode(node));
  
  // Combine boundary nodes with existing nodes
  const allNodes = [...boundaryNodes, ...migratedNodes];
  
  return ensureDerivedPorts({
    ...graph,
    nodes: allNodes,
  });
}

/**
 * Migrate a legacy node (potentially a subnet) that has ports but no boundary nodes.
 */
function migrateLegacyNode(node: Node): Node {
  // If not a subnet, return as-is
  if (!node.nodes || node.nodes.length === 0) {
    return node;
  }
  
  // Check if subnet already has boundary nodes
  const hasBoundaryNodes = node.nodes.some(n => 
    n.name.startsWith(BOUNDARY_PREFIXES.input) ||
    n.name.startsWith(BOUNDARY_PREFIXES.output) ||
    n.name.startsWith(BOUNDARY_PREFIXES.prop)
  );
  
  if (hasBoundaryNodes) {
    // Already has boundary nodes, just process nested subnets
    return {
      ...node,
      nodes: node.nodes.map(n => migrateLegacyNode(n)),
    };
  }
  
  // Generate boundary nodes from inputs/outputs
  const boundaryNodes: Node[] = [];
  
  (node.inputs || []).forEach((port, i) => {
    boundaryNodes.push({
      name: `${BOUNDARY_PREFIXES.input}${port.name}`,
      type: 'core/graph/input',
      kind: 'graphInput',
      meta: { x: 50, y: 50 + i * 100 },
      props: port.type !== 'any' ? [{ name: 'valueType', type: 'string', value: port.type }] : [],
    });
  });
  
  (node.outputs || []).forEach((port, i) => {
    boundaryNodes.push({
      name: `${BOUNDARY_PREFIXES.output}${port.name}`,
      type: 'core/graph/output',
      kind: 'graphOutput',
      meta: { x: 500, y: 50 + i * 100 },
      props: port.type !== 'any' ? [{ name: 'valueType', type: 'string', value: port.type }] : [],
    });
  });
  
  // Recursively migrate nested subnets
  const migratedNodes = node.nodes.map(n => migrateLegacyNode(n));
  
  return {
    ...node,
    nodes: [...boundaryNodes, ...migratedNodes],
  };
}

// =============================================================================
// STORAGE TRANSFORMATION (strip derived fields)
// =============================================================================

/**
 * Prepare a graph for storage by stripping derived fields.
 * The boundary nodes remain as the source of truth.
 * 
 * Note: We keep inputs/outputs/props in storage for backward compatibility,
 * but they are derived from boundary nodes, not the other way around.
 */
export function prepareForStorage(graph: Graph): Graph {
  // For now, we keep the derived fields for backward compatibility
  // The key insight is that boundary nodes are the source of truth
  // and the derived fields are just for convenience
  return ensureDerivedPorts(graph);
}

// =============================================================================
// EDGE ID HELPERS
// =============================================================================

/**
 * Generate a unique ID for an edge based on its endpoints.
 */
export function getEdgeId(edge: Edge): string {
  return `${edge.src.node}:${edge.src.port}->${edge.dst.node}:${edge.dst.port}`;
}

/**
 * Generate a unique node ID.
 */
export function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
