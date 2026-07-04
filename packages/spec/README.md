# @fbp/spec

Storage specification and manipulation API for flow-based programming graphs.

## Table of Contents

1. [Overview](#overview)
2. [Design Philosophy](#design-philosophy)
3. [Storage Schema](#storage-schema)
4. [Normative Rules](#normative-rules)
5. [Renderer Types](#renderer-types)
6. [API Reference](#api-reference)
7. [Examples](#examples)
8. [Migration Guide](#migration-guide)

---

## Overview

This package provides a two-layer type system for flow-based programming graphs:

| Layer | Purpose | File |
|-------|---------|------|
| **Storage** | Minimal canonical format for persistence | `types.ts` |
| **Renderer** | Extended types with derived data for UI | `renderer.ts` |
| **API** | Pure functions for graph manipulation | `api.ts` |

The storage layer is designed for content-addressable storage (merkle trees) where each graph state can be uniquely hashed.

---

## Design Philosophy

### Boundary Nodes as Single Source of Truth

Traditional graph formats store interface definitions in two places:
1. `inputs/outputs/props` arrays on the node/graph
2. Boundary nodes inside subnets

This dual representation causes sync bugs when one is updated without the other.

**This spec eliminates the problem by using boundary nodes as the ONLY source of truth.**

The `inputs/outputs/props` arrays are:
- **NOT stored** in the storage format
- **Derived at runtime** from boundary nodes
- **Cached** in the renderer layer for performance

### Boundary Node Design

Boundary nodes use a **property-based approach** that separates the tree key (storage identifier) from the semantic name (port/prop name):

| Node Type | Purpose | Key Example | Properties |
|-----------|---------|-------------|------------|
| `graphInput` | Input port | `input_a` | `portName: "a"`, `dataType: "number"` |
| `graphOutput` | Output port | `output_result` | `portName: "result"`, `dataType: "number"` |
| `graphProp` | Configuration property | `prop_threshold` | `propName: "threshold"`, `dataType: "number"`, `default: 0.5` |

**Key benefits:**
- The node's `type` property identifies it as a boundary node (no prefix parsing needed)
- The port/prop name is stored as a property, allowing flexible renaming without moving the node
- Clean separation between tree structure and semantic meaning

### Path-Based Identity

Nodes are identified by their path from the root:

```
/                     # Root scope
/add1                 # Root-level node named "add1"
/subnet1/add1         # Node "add1" inside "subnet1"
/subnet1/nested/add1  # Deeply nested node
```

### Per-Scope Edges

Edges are stored within the scope they belong to, not globally. This means:
- Root-level edges are in `graph.edges`
- Subnet edges are in `node.edges` (inside the subnet node)

This matches the filesystem mental model where each "folder" (node with children) contains its own connections.

---

## Storage Schema

### Graph

The top-level container for a flow-based program.

```typescript
interface Graph {
  name?: string;              // Optional graph name
  nodes: Node[];              // Root-level nodes
  edges: Edge[];              // Root-level edges
  definitions?: NodeDefinition[];  // Inline node type definitions
  meta?: NodeMeta;            // Optional metadata
}
```

**Required fields:** `nodes`, `edges`

**Note:** No `inputs`, `outputs`, or `props` arrays. The graph's interface is defined by boundary nodes at the root level.

### Node

A node instance in the graph.

```typescript
interface Node {
  name: string;               // Unique within parent scope
  type: string;               // References a NodeDefinition
  meta?: NodeMeta;            // Position and metadata
  props?: PropValue[];        // Property values for this instance
  nodes?: Node[];             // Child nodes (makes this a subnet)
  edges?: Edge[];             // Edges within this scope
}
```

**Required fields:** `name`, `type`

**Subnet detection:** A node with `nodes` array is a subnet. Its interface is defined by its internal boundary nodes (nodes with type `graphInput`, `graphOutput`, or `graphProp`).

### Edge

A connection between two ports within the same scope.

```typescript
interface Edge {
  src: PortRef;               // Source (output port)
  dst: PortRef;               // Destination (input port)
  channel?: string;           // Optional channel (default: "main")
}

interface PortRef {
  node: string;               // Node name within scope
  port: string;               // Port name
}
```

**Required fields:** `src`, `dst`

**Scope rule:** Both `src.node` and `dst.node` must be nodes within the same scope. No cross-scope edges.

### PropValue

A property value on a node instance.

```typescript
interface PropValue {
  name: string;               // Property name
  value?: any;                // The value (any JSON value)
  ref?: boolean;              // If true, value is a reference path
}
```

**Required fields:** `name`

**References:** When `ref: true`, the `value` is interpreted as a path reference that resolves at runtime.

### NodeMeta

Position and metadata for visual layout.

```typescript
interface NodeMeta {
  x?: number;                 // X coordinate
  y?: number;                 // Y coordinate
  description?: string;       // Human-readable description
}
```

All fields are optional.

### NodeDefinition

Definition of a reusable node type (like a class).

```typescript
interface NodeDefinition {
  type: string;               // Unique identifier (e.g., "math:add")
  context?: string;           // Namespace (e.g., "math", "ui")
  category?: string;          // Palette category
  inputs?: PortDef[];         // Input port definitions
  outputs?: PortDef[];        // Output port definitions
  props?: PropDef[];          // Property definitions
  icon?: string;              // Icon identifier
  description?: string;       // Human-readable description
}
```

**Required fields:** `type`

### PortDef

A port definition on a node type.

```typescript
interface PortDef {
  name: string;               // Port name
  type?: string;              // Data type (e.g., "string", "number", "any")
  multi?: boolean;            // If true, accepts multiple connections
  description?: string;       // Human-readable description
}
```

**Required fields:** `name`

### PropDef

A property definition on a node type.

```typescript
interface PropDef {
  name: string;               // Property name
  type?: string;              // Data type
  default?: any;              // Default value
  description?: string;       // Human-readable description
}
```

**Required fields:** `name`

---

## Normative Rules

These rules define the semantics of the storage format:

### Rule 1: Boundary Nodes ARE the Interface

Boundary nodes (nodes with type `graphInput`, `graphOutput`, or `graphProp`) define a subnet's ports. There are no separate `inputs/outputs/props` arrays in the storage format.

**Derivation:** At runtime, iterate over a scope's nodes and extract those with boundary types. The port/prop name is read from the `portName` or `propName` property.

### Rule 2: Edges are Per-Scope

Each node with children stores its own `edges` array. Edges only connect nodes within the same scope.

**Invalid:** An edge from `/subnet1/nodeA` to `/subnet2/nodeB`
**Valid:** An edge from `nodeA` to `nodeB` within the same scope

### Rule 3: Path-Based Identity

A node's identity is its path from the root. Renaming or moving a node changes its identity. References must be updated by tooling.

**Path format:** `/` for root, `/name` for root-level, `/parent/child` for nested

### Rule 4: Minimal Storage

Only store what's needed to reconstruct the graph. Derived data (like port arrays) is computed at runtime.

**Stored:** Boundary nodes, edges, property values
**Derived:** `inputs/outputs/props` arrays, computed layouts

---

## Renderer Types

The renderer layer extends storage types with derived data and runtime state.

### RuntimeNode

A node with derived port information.

```typescript
interface RuntimeNode extends Node {
  inputs?: PortDef[];         // Derived from graphInput boundary nodes
  outputs?: PortDef[];        // Derived from graphOutput boundary nodes
  props?: PropDef[];          // Derived from graphProp boundary nodes
  nodes?: RuntimeNode[];      // Children with derived data
}
```

### RuntimeGraph

A graph with derived port information.

```typescript
interface RuntimeGraph extends Graph {
  inputs?: PortDef[];         // Derived from graphInput boundary nodes
  outputs?: PortDef[];        // Derived from graphOutput boundary nodes
  props?: PropDef[];          // Derived from graphProp boundary nodes
  nodes: RuntimeNode[];       // Nodes with derived data
}
```

### ViewState

Camera/viewport state for the canvas.

```typescript
interface ViewState {
  pan: { x: number; y: number };  // Pan offset
  zoom: number;                    // Zoom level (1.0 = 100%)
}
```

### SelectionState

Current selection in the editor.

```typescript
interface SelectionState {
  nodeIds: Set<string>;       // Selected node names
  edgeIds: Set<string>;       // Selected edge identifiers
}
```

### EditorState

Complete editor state for a single view/tab.

```typescript
interface EditorState {
  graph: RuntimeGraph;                    // Graph with derived ports
  definitions: Map<string, NodeDefinition>;  // Type definitions
  cwd: string;                            // Current scope path
  view: ViewState;                        // Viewport state
  selection: SelectionState;              // Selection state
  connecting: ConnectingState;            // Edge creation state
  boxSelect: BoxSelectState;              // Marquee selection state
  clipboard: ClipboardState;              // Copy/paste buffer
}
```

### Multi-Tab Support (Future)

```typescript
interface ViewProcess {
  pid: string;                // Process identifier
  cwd: string;                // Current working directory
  view: ViewState;            // Per-tab viewport
  selection: SelectionState;  // Per-tab selection
}

interface MultiTabEditorState {
  data: GraphData;                        // Shared graph data
  processes: Map<string, ViewProcess>;    // Per-tab state
  activeProcessId: string;                // Active tab
  clipboard: ClipboardState;              // Shared clipboard
}
```

---

## API Reference

All API functions are pure and immutable - they return new graphs without modifying the original.

### Path Utilities

#### `parsePath(path: string): string[]`

Parse a path string into segments.

```typescript
parsePath('/')           // []
parsePath('/foo')        // ['foo']
parsePath('/foo/bar')    // ['foo', 'bar']
```

#### `joinPath(segments: string[]): string`

Join path segments into a path string.

```typescript
joinPath([])             // '/'
joinPath(['foo'])        // '/foo'
joinPath(['foo', 'bar']) // '/foo/bar'
```

#### `getParentPath(path: string): string`

Get the parent scope path.

```typescript
getParentPath('/')           // '/'
getParentPath('/foo')        // '/'
getParentPath('/foo/bar')    // '/foo'
```

#### `getNodeName(path: string): string | null`

Get the node name from a path.

```typescript
getNodeName('/')           // null
getNodeName('/foo')        // 'foo'
getNodeName('/foo/bar')    // 'bar'
```

#### `isRootPath(path: string): boolean`

Check if a path is the root.

```typescript
isRootPath('/')    // true
isRootPath('/foo') // false
```

### Node Operations

#### `insertNode(graph: Graph, scopePath: string, node: Node): Graph`

Insert a node at a scope.

```typescript
const newGraph = insertNode(graph, '/', { 
  name: 'add1', 
  type: 'math:add' 
});

// Insert into a subnet
const newGraph = insertNode(graph, '/subnet1', { 
  name: 'multiply1', 
  type: 'math:multiply' 
});
```

#### `removeNode(graph: Graph, nodePath: string): Graph`

Remove a node and any connected edges.

```typescript
const newGraph = removeNode(graph, '/add1');
const newGraph = removeNode(graph, '/subnet1/multiply1');
```

#### `renameNode(graph: Graph, nodePath: string, newName: string): Graph`

Rename a node and update all edge references.

```typescript
const newGraph = renameNode(graph, '/add1', 'adder');
```

#### `moveNode(graph: Graph, fromPath: string, toScopePath: string): Graph`

Move a node to a different scope.

```typescript
// Move from root to inside subnet1
const newGraph = moveNode(graph, '/add1', '/subnet1');
```

### Property Operations

#### `setProps(graph: Graph, nodePath: string, props: PropValue[]): Graph`

Set or merge properties on a node.

```typescript
const newGraph = setProps(graph, '/add1', [
  { name: 'a', value: 5 },
  { name: 'b', value: 10 }
]);
```

#### `getProps(graph: Graph, nodePath: string): PropValue[]`

Get properties from a node.

```typescript
const props = getProps(graph, '/add1');
// [{ name: 'a', value: 5 }, { name: 'b', value: 10 }]
```

#### `removeProp(graph: Graph, nodePath: string, propName: string): Graph`

Remove a property from a node.

```typescript
const newGraph = removeProp(graph, '/add1', 'a');
```

### Edge Operations

#### `addEdge(graph: Graph, scopePath: string, edge: Edge): Graph`

Add an edge at a scope.

```typescript
const newGraph = addEdge(graph, '/', {
  src: { node: 'input1', port: 'value' },
  dst: { node: 'add1', port: 'a' }
});
```

#### `removeEdge(graph: Graph, scopePath: string, src: PortRef, dst: PortRef): Graph`

Remove an edge.

```typescript
const newGraph = removeEdge(graph, '/',
  { node: 'input1', port: 'value' },
  { node: 'add1', port: 'a' }
);
```

### Query Helpers

#### `getNode(graph: Graph, path: string): Node | null`

Get a node by path.

```typescript
const node = getNode(graph, '/subnet1/add1');
```

#### `getNodes(graph: Graph, scopePath: string): Node[]`

Get all nodes at a scope.

```typescript
const rootNodes = getNodes(graph, '/');
const subnetNodes = getNodes(graph, '/subnet1');
```

#### `getEdges(graph: Graph, scopePath: string): Edge[]`

Get all edges at a scope.

```typescript
const rootEdges = getEdges(graph, '/');
const subnetEdges = getEdges(graph, '/subnet1');
```

#### `findNodes(graph: Graph, predicate: (node, path) => boolean): Array<{node, path}>`

Find nodes recursively matching a predicate.

```typescript
const addNodes = findNodes(graph, (node) => node.type === 'math:add');
// [{ node: {...}, path: '/add1' }, { node: {...}, path: '/subnet1/add2' }]
```

#### `findBoundaryNodes(graph: Graph, scopePath: string): { inputs, outputs, props }`

Find boundary nodes at a scope.

```typescript
const boundary = findBoundaryNodes(graph, '/subnet1');
// {
//   inputs: [{ name: 'input_a', type: 'graphInput', props: [{ name: 'portName', value: 'a' }] }],
//   outputs: [{ name: 'output_result', type: 'graphOutput', props: [{ name: 'portName', value: 'result' }] }],
//   props: [{ name: 'prop_mode', type: 'graphProp', props: [{ name: 'propName', value: 'mode' }] }]
// }
```

#### `hasNode(graph: Graph, path: string): boolean`

Check if a node exists.

```typescript
if (hasNode(graph, '/subnet1/add1')) {
  // node exists
}
```

#### `countNodes(graph: Graph): number`

Count all nodes recursively.

```typescript
const total = countNodes(graph); // 42
```

### Metadata Operations

#### `setMeta(graph: Graph, nodePath: string, meta: Partial<NodeMeta>): Graph`

Set metadata on a node.

```typescript
const newGraph = setMeta(graph, '/add1', { description: 'Adds two numbers' });
```

#### `setPosition(graph: Graph, nodePath: string, x: number, y: number): Graph`

Set position of a node.

```typescript
const newGraph = setPosition(graph, '/add1', 100, 200);
```

---

## Examples

### Simple Math Graph

A graph that adds two numbers:

```json
{
  "nodes": [
    { 
      "name": "input_a", 
      "type": "graphInput", 
      "meta": { "x": 0, "y": 0 },
      "props": [{ "name": "portName", "value": "a" }, { "name": "dataType", "value": "number" }]
    },
    { 
      "name": "input_b", 
      "type": "graphInput", 
      "meta": { "x": 0, "y": 100 },
      "props": [{ "name": "portName", "value": "b" }, { "name": "dataType", "value": "number" }]
    },
    { "name": "add1", "type": "math:add", "meta": { "x": 200, "y": 50 } },
    { 
      "name": "output_result", 
      "type": "graphOutput", 
      "meta": { "x": 400, "y": 50 },
      "props": [{ "name": "portName", "value": "result" }, { "name": "dataType", "value": "number" }]
    }
  ],
  "edges": [
    { "src": { "node": "input_a", "port": "value" }, "dst": { "node": "add1", "port": "a" } },
    { "src": { "node": "input_b", "port": "value" }, "dst": { "node": "add1", "port": "b" } },
    { "src": { "node": "add1", "port": "result" }, "dst": { "node": "output_result", "port": "value" } }
  ]
}
```

**Derived interface:** `inputs: [a, b]`, `outputs: [result]` (derived from `portName` properties)

### Subnet Example

A graph with a reusable "double" subnet:

```json
{
  "nodes": [
    { 
      "name": "input_value", 
      "type": "graphInput",
      "props": [{ "name": "portName", "value": "value" }]
    },
    {
      "name": "double",
      "type": "subnet",
      "nodes": [
        { 
          "name": "input_x", 
          "type": "graphInput",
          "props": [{ "name": "portName", "value": "x" }]
        },
        { "name": "mult", "type": "math:multiply", "props": [{ "name": "b", "value": 2 }] },
        { 
          "name": "output_result", 
          "type": "graphOutput",
          "props": [{ "name": "portName", "value": "result" }]
        }
      ],
      "edges": [
        { "src": { "node": "input_x", "port": "value" }, "dst": { "node": "mult", "port": "a" } },
        { "src": { "node": "mult", "port": "result" }, "dst": { "node": "output_result", "port": "value" } }
      ]
    },
    { 
      "name": "output_doubled", 
      "type": "graphOutput",
      "props": [{ "name": "portName", "value": "doubled" }]
    }
  ],
  "edges": [
    { "src": { "node": "input_value", "port": "value" }, "dst": { "node": "double", "port": "x" } },
    { "src": { "node": "double", "port": "result" }, "dst": { "node": "output_doubled", "port": "value" } }
  ]
}
```

**Subnet interface:** Derived from `input_x` (portName: "x") and `output_result` (portName: "result") inside the subnet.

### Using the API

```typescript
import { 
  insertNode, 
  addEdge, 
  setProps, 
  findBoundaryNodes 
} from '@fbp/spec';

// Start with empty graph
let graph = { nodes: [], edges: [] };

// Add boundary nodes with portName properties
graph = insertNode(graph, '/', { 
  name: 'input_a', 
  type: 'graphInput',
  props: [{ name: 'portName', value: 'a' }, { name: 'dataType', value: 'number' }]
});
graph = insertNode(graph, '/', { 
  name: 'input_b', 
  type: 'graphInput',
  props: [{ name: 'portName', value: 'b' }, { name: 'dataType', value: 'number' }]
});
graph = insertNode(graph, '/', { 
  name: 'output_result', 
  type: 'graphOutput',
  props: [{ name: 'portName', value: 'result' }, { name: 'dataType', value: 'number' }]
});

// Add processing node
graph = insertNode(graph, '/', { name: 'add1', type: 'math:add' });

// Connect edges (reference nodes by their keys)
graph = addEdge(graph, '/', { 
  src: { node: 'input_a', port: 'value' }, 
  dst: { node: 'add1', port: 'a' } 
});
graph = addEdge(graph, '/', { 
  src: { node: 'input_b', port: 'value' }, 
  dst: { node: 'add1', port: 'b' } 
});
graph = addEdge(graph, '/', { 
  src: { node: 'add1', port: 'result' }, 
  dst: { node: 'output_result', port: 'value' } 
});

// Derive interface from boundary nodes
const boundary = findBoundaryNodes(graph, '/');
console.log(boundary.inputs);  // [{ name: 'input_a', portName: 'a', ... }]
console.log(boundary.outputs); // [{ name: 'output_result', portName: 'result', ... }]
```

---

## Migration Guide

### From Legacy Format (with inputs/outputs/props arrays)

Legacy graphs may have explicit `inputs/outputs/props` arrays:

```json
{
  "inputs": [{ "name": "a", "type": "number" }],
  "outputs": [{ "name": "result", "type": "number" }],
  "nodes": [...],
  "edges": [...]
}
```

**Migration steps:**

1. For each item in `inputs`, create a `graphInput` boundary node with `portName` property
2. For each item in `outputs`, create a `graphOutput` boundary node with `portName` property
3. For each item in `props`, create a `graphProp` boundary node with `propName` property
4. Remove the `inputs/outputs/props` arrays
5. Update edges to reference the new node keys

**Example migration:**
```json
// Before (legacy)
{ "inputs": [{ "name": "a", "type": "number" }] }

// After (property-based)
{ 
  "nodes": [
    { 
      "name": "input_a", 
      "type": "graphInput", 
      "props": [
        { "name": "portName", "value": "a" },
        { "name": "dataType", "value": "number" }
      ]
    }
  ]
}
```

The `@fbp/graph-editor` package includes a `migrateLegacyGraph()` function that handles this automatically.

---

## Schema Validation

The JSON schema (`graph.schema.json`) can be used to validate graphs:

```typescript
import Ajv from 'ajv';
import schema from '@fbp/spec/graph.schema.json';

const ajv = new Ajv();
const validate = ajv.compile(schema);

if (!validate(graph)) {
  console.error(validate.errors);
}
```

---

## License

MIT
