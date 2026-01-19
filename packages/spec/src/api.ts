/**
 * @fbp/spec - Graph Manipulation API
 * 
 * Pure functions for manipulating graphs using path-based addressing.
 * All functions are immutable - they return new graphs without modifying the original.
 * 
 * Path format: "/" for root, "/nodeName" for root-level node, "/parent/child" for nested
 */

import type { Graph, Node, Edge, PropValue, PortRef } from './types';

// =============================================================================
// PATH UTILITIES
// =============================================================================

/**
 * Parse a path string into segments.
 * "/" -> []
 * "/foo" -> ["foo"]
 * "/foo/bar" -> ["foo", "bar"]
 */
export function parsePath(path: string): string[] {
  if (path === '/' || path === '') return [];
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return normalized.split('/').filter(Boolean);
}

/**
 * Join path segments into a path string.
 * [] -> "/"
 * ["foo"] -> "/foo"
 * ["foo", "bar"] -> "/foo/bar"
 */
export function joinPath(segments: string[]): string {
  if (segments.length === 0) return '/';
  return '/' + segments.join('/');
}

/**
 * Get the parent path.
 * "/" -> "/"
 * "/foo" -> "/"
 * "/foo/bar" -> "/foo"
 */
export function getParentPath(path: string): string {
  const segments = parsePath(path);
  if (segments.length === 0) return '/';
  return joinPath(segments.slice(0, -1));
}

/**
 * Get the node name from a path.
 * "/" -> null
 * "/foo" -> "foo"
 * "/foo/bar" -> "bar"
 */
export function getNodeName(path: string): string | null {
  const segments = parsePath(path);
  if (segments.length === 0) return null;
  return segments[segments.length - 1];
}

/**
 * Check if a path is the root.
 */
export function isRootPath(path: string): boolean {
  return path === '/' || path === '';
}

// =============================================================================
// NODE ACCESS
// =============================================================================

/**
 * Get a node by path.
 * Returns null if not found.
 */
export function getNode(graph: Graph, path: string): Node | null {
  const segments = parsePath(path);
  if (segments.length === 0) return null;
  
  let nodes = graph.nodes;
  for (let i = 0; i < segments.length; i++) {
    const name = segments[i];
    const node = nodes.find(n => n.name === name);
    if (!node) return null;
    
    if (i === segments.length - 1) {
      return node;
    }
    
    if (!node.nodes) return null;
    nodes = node.nodes;
  }
  
  return null;
}

/**
 * Get all nodes at a scope (path).
 * "/" returns root-level nodes.
 */
export function getNodes(graph: Graph, path: string): Node[] {
  if (isRootPath(path)) {
    return graph.nodes;
  }
  
  const node = getNode(graph, path);
  return node?.nodes || [];
}

/**
 * Get all edges at a scope (path).
 * "/" returns root-level edges.
 */
export function getEdges(graph: Graph, path: string): Edge[] {
  if (isRootPath(path)) {
    return graph.edges;
  }
  
  const node = getNode(graph, path);
  return node?.edges || [];
}

// =============================================================================
// NODE MUTATIONS
// =============================================================================

/**
 * Insert a node at a scope.
 * 
 * @param graph - The graph to modify
 * @param scopePath - The scope to insert into ("/" for root, "/parent" for inside parent)
 * @param node - The node to insert
 * @returns New graph with the node inserted
 */
export function insertNode(graph: Graph, scopePath: string, node: Node): Graph {
  if (isRootPath(scopePath)) {
    return {
      ...graph,
      nodes: [...graph.nodes, node]
    };
  }
  
  return updateNodeAtPath(graph, scopePath, parent => ({
    ...parent,
    nodes: [...(parent.nodes || []), node]
  }));
}

/**
 * Remove a node by path.
 * Also removes any edges connected to the node.
 * 
 * @param graph - The graph to modify
 * @param nodePath - The path to the node to remove
 * @returns New graph with the node removed
 */
export function removeNode(graph: Graph, nodePath: string): Graph {
  const segments = parsePath(nodePath);
  if (segments.length === 0) return graph;
  
  const nodeName = segments[segments.length - 1];
  const scopePath = getParentPath(nodePath);
  
  if (isRootPath(scopePath)) {
    return {
      ...graph,
      nodes: graph.nodes.filter(n => n.name !== nodeName),
      edges: graph.edges.filter(e => e.src.node !== nodeName && e.dst.node !== nodeName)
    };
  }
  
  return updateNodeAtPath(graph, scopePath, parent => ({
    ...parent,
    nodes: (parent.nodes || []).filter(n => n.name !== nodeName),
    edges: (parent.edges || []).filter(e => e.src.node !== nodeName && e.dst.node !== nodeName)
  }));
}

/**
 * Rename a node.
 * Also updates any edges that reference the node.
 * 
 * @param graph - The graph to modify
 * @param nodePath - The path to the node to rename
 * @param newName - The new name for the node
 * @returns New graph with the node renamed
 */
export function renameNode(graph: Graph, nodePath: string, newName: string): Graph {
  const segments = parsePath(nodePath);
  if (segments.length === 0) return graph;
  
  const oldName = segments[segments.length - 1];
  const scopePath = getParentPath(nodePath);
  
  const updateEdgeRefs = (edges: Edge[]): Edge[] =>
    edges.map(e => ({
      ...e,
      src: e.src.node === oldName ? { ...e.src, node: newName } : e.src,
      dst: e.dst.node === oldName ? { ...e.dst, node: newName } : e.dst
    }));
  
  if (isRootPath(scopePath)) {
    return {
      ...graph,
      nodes: graph.nodes.map(n => n.name === oldName ? { ...n, name: newName } : n),
      edges: updateEdgeRefs(graph.edges)
    };
  }
  
  return updateNodeAtPath(graph, scopePath, parent => ({
    ...parent,
    nodes: (parent.nodes || []).map(n => n.name === oldName ? { ...n, name: newName } : n),
    edges: updateEdgeRefs(parent.edges || [])
  }));
}

/**
 * Move a node to a different scope.
 * 
 * @param graph - The graph to modify
 * @param fromPath - Current path of the node
 * @param toScopePath - Destination scope path
 * @returns New graph with the node moved
 */
export function moveNode(graph: Graph, fromPath: string, toScopePath: string): Graph {
  const node = getNode(graph, fromPath);
  if (!node) return graph;
  
  // Remove from old location
  let newGraph = removeNode(graph, fromPath);
  
  // Insert at new location
  newGraph = insertNode(newGraph, toScopePath, node);
  
  return newGraph;
}

// =============================================================================
// PROPERTY MUTATIONS
// =============================================================================

/**
 * Set properties on a node.
 * Merges with existing props (overwrites by name).
 * 
 * @param graph - The graph to modify
 * @param nodePath - The path to the node
 * @param props - Properties to set
 * @returns New graph with properties updated
 */
export function setProps(graph: Graph, nodePath: string, props: PropValue[]): Graph {
  return updateNodeAtPath(graph, nodePath, node => {
    const existingProps = node.props || [];
    const newPropNames = new Set(props.map(p => p.name));
    const mergedProps = [
      ...existingProps.filter(p => !newPropNames.has(p.name)),
      ...props
    ];
    return { ...node, props: mergedProps };
  });
}

/**
 * Get properties from a node.
 * 
 * @param graph - The graph
 * @param nodePath - The path to the node
 * @returns Properties array or empty array if not found
 */
export function getProps(graph: Graph, nodePath: string): PropValue[] {
  const node = getNode(graph, nodePath);
  return node?.props || [];
}

/**
 * Remove a property from a node.
 * 
 * @param graph - The graph to modify
 * @param nodePath - The path to the node
 * @param propName - The property name to remove
 * @returns New graph with property removed
 */
export function removeProp(graph: Graph, nodePath: string, propName: string): Graph {
  return updateNodeAtPath(graph, nodePath, node => ({
    ...node,
    props: (node.props || []).filter(p => p.name !== propName)
  }));
}

// =============================================================================
// EDGE MUTATIONS
// =============================================================================

/**
 * Add an edge at a scope.
 * 
 * @param graph - The graph to modify
 * @param scopePath - The scope to add the edge to
 * @param edge - The edge to add
 * @returns New graph with the edge added
 */
export function addEdge(graph: Graph, scopePath: string, edge: Edge): Graph {
  if (isRootPath(scopePath)) {
    return {
      ...graph,
      edges: [...graph.edges, edge]
    };
  }
  
  return updateNodeAtPath(graph, scopePath, parent => ({
    ...parent,
    edges: [...(parent.edges || []), edge]
  }));
}

/**
 * Remove an edge at a scope.
 * 
 * @param graph - The graph to modify
 * @param scopePath - The scope containing the edge
 * @param src - Source port reference
 * @param dst - Destination port reference
 * @returns New graph with the edge removed
 */
export function removeEdge(graph: Graph, scopePath: string, src: PortRef, dst: PortRef): Graph {
  const matchesEdge = (e: Edge) =>
    e.src.node === src.node && e.src.port === src.port &&
    e.dst.node === dst.node && e.dst.port === dst.port;
  
  if (isRootPath(scopePath)) {
    return {
      ...graph,
      edges: graph.edges.filter(e => !matchesEdge(e))
    };
  }
  
  return updateNodeAtPath(graph, scopePath, parent => ({
    ...parent,
    edges: (parent.edges || []).filter(e => !matchesEdge(e))
  }));
}

// =============================================================================
// META MUTATIONS
// =============================================================================

/**
 * Set metadata on a node (position, description, etc.).
 * 
 * @param graph - The graph to modify
 * @param nodePath - The path to the node
 * @param meta - Metadata to set (merged with existing)
 * @returns New graph with metadata updated
 */
export function setMeta(graph: Graph, nodePath: string, meta: Partial<Node['meta']>): Graph {
  return updateNodeAtPath(graph, nodePath, node => ({
    ...node,
    meta: { ...node.meta, ...meta }
  }));
}

/**
 * Set position of a node.
 * 
 * @param graph - The graph to modify
 * @param nodePath - The path to the node
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns New graph with position updated
 */
export function setPosition(graph: Graph, nodePath: string, x: number, y: number): Graph {
  return setMeta(graph, nodePath, { x, y });
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Update a node at a path using an updater function.
 * Internal helper for immutable updates.
 */
function updateNodeAtPath(
  graph: Graph,
  path: string,
  updater: (node: Node) => Node
): Graph {
  const segments = parsePath(path);
  if (segments.length === 0) return graph;
  
  function updateNodes(nodes: Node[], depth: number): Node[] {
    const name = segments[depth];
    return nodes.map(node => {
      if (node.name !== name) return node;
      
      if (depth === segments.length - 1) {
        // This is the target node
        return updater(node);
      }
      
      // Recurse into children
      if (!node.nodes) return node;
      return {
        ...node,
        nodes: updateNodes(node.nodes, depth + 1)
      };
    });
  }
  
  return {
    ...graph,
    nodes: updateNodes(graph.nodes, 0)
  };
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Find all nodes matching a predicate.
 * Searches recursively through all scopes.
 * 
 * @param graph - The graph to search
 * @param predicate - Function to test each node
 * @returns Array of matching nodes with their paths
 */
export function findNodes(
  graph: Graph,
  predicate: (node: Node, path: string) => boolean
): Array<{ node: Node; path: string }> {
  const results: Array<{ node: Node; path: string }> = [];
  
  function search(nodes: Node[], basePath: string) {
    for (const node of nodes) {
      const path = basePath === '/' ? `/${node.name}` : `${basePath}/${node.name}`;
      if (predicate(node, path)) {
        results.push({ node, path });
      }
      if (node.nodes) {
        search(node.nodes, path);
      }
    }
  }
  
  search(graph.nodes, '/');
  return results;
}

/**
 * Find all boundary nodes (inputs, outputs, props) at a scope.
 * 
 * @param graph - The graph
 * @param scopePath - The scope to search
 * @returns Object with inputs, outputs, and props arrays
 */
export function findBoundaryNodes(graph: Graph, scopePath: string): {
  inputs: Node[];
  outputs: Node[];
  props: Node[];
} {
  const nodes = getNodes(graph, scopePath);
  return {
    inputs: nodes.filter(n => n.name.startsWith('@in:')),
    outputs: nodes.filter(n => n.name.startsWith('@out:')),
    props: nodes.filter(n => n.name.startsWith('@prop:'))
  };
}

/**
 * Check if a node exists at a path.
 */
export function hasNode(graph: Graph, path: string): boolean {
  return getNode(graph, path) !== null;
}

/**
 * Count all nodes in the graph (recursive).
 */
export function countNodes(graph: Graph): number {
  function count(nodes: Node[]): number {
    return nodes.reduce((sum, node) => {
      return sum + 1 + (node.nodes ? count(node.nodes) : 0);
    }, 0);
  }
  return count(graph.nodes);
}
