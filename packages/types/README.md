# @fbp/types

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

Flow-Based Programming schemas spec

<p align="center" width="100%">
  <a href="https://github.com/flow-based-programming/spec/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/flow-based-programming/spec/actions/workflows/ci.yml/badge.svg" />
  </a>
</p>

## install

```sh
npm install @fbp/types
````

# GraphSchemata Specification

This document describes **GraphSchemata**, a Houdini-inspired, merkle-friendly graph specification for composing systems out of nested nodes, explicit ports, and deterministic structure.

The core goals are:

* **Explicitness over magic**
* **Composable subgraphs (“folders”)**
* **Stable, content-addressable structure**
* **Clear separation between dataflow and configuration**
* **No implicit behavior (no hidden lanes, no implicit merges)**

---

## Core Concepts

### Everything is a Node

The entire document is a single **Node**.
Nodes may contain other nodes and edges, forming **nested graphs (subnets)**.

A node becomes a **subnet** simply by containing:

* `nodes[]`
* `edges[]`

There is no separate “graph” type.

---

## Identity Model

* **Node identity = name within parent scope**
* Names may be hierarchical paths by convention (`some/subnet/node`)
* **Rename or move = identity change**
* Tooling is responsible for rewriting references

This model is intentionally compatible with **merkle / content-addressable versioning**.

---

## Node Structure

Each node has a **public signature** and optional internal structure.

### Public Signature (Contract)

Defined directly on the node:

* `inputs[]` — dataflow inputs
* `outputs[]` — dataflow outputs
* `props[]` — configuration parameters

This signature is the **public API** of the node.

For leaf nodes, the signature may be derived from a registry.
For subnets, the signature is explicitly declared and editable.

---

## Ports (No Lanes)

Ports are:

* **Named**
* **Typed**
* **Singular**

There is **no lane or index dimension**.

### Consequences

* Branching uses **multiple named output ports**

  * e.g. `true`, `false`, `error`, `caseA`
* Fan-in is **never implicit**

  * Multiple values must be combined via explicit nodes (`Merge`, `Collect`, etc.)
* Inputs always match their declared type

This mirrors Houdini’s “typed sockets” philosophy.

---

## Props vs Dataflow

Props (`props`) are **not dataflow**.

* They configure node behavior
* They are not connected by edges
* They may reference other parameters or graph paths via `Ref`

Example parameter value:

```json
{ "ref": "../config/apiKey" }
```

Breaking refs on rename is expected and accepted.

> Note: You may optionally choose to expose parameters visually via `@props` boundary ports, but props remain a configuration contract (not implicit dataflow).

---

## Edges

Edges connect **output ports → input ports**.

```txt
A.outputs.out  →  B.inputs.in
```

### Edge Rules

* Edges are **in-scope only**

  * `EdgeEndpoint.node` must reference a sibling node (within the same `nodes[]` array of the containing subnet)
* No cross-scope or implicit parent/child wiring
* No implicit fan-in
* No implicit transformations

If logic is needed, insert a node.

---

## Channels

Edges may optionally specify a `channel`.

```json
{
  "src": { "node": "A", "port": "out" },
  "dst": { "node": "B", "port": "in" },
  "channel": "error"
}
```

### Channel Semantics

* `channel` is a **namespace**, not a type
* Default channel is `"main"`
* Omit `channel` when using `"main"`
* Non-main channels are for:

  * error routing
  * control/dependency edges
  * metadata propagation
  * future extensions

Channels do **not** imply different data types or execution unless the engine defines them.

---

## Subnets (Nested Graphs)

A subnet is just a node with children.

### Public Interface

A subnet’s public interface is defined by its own:

* `inputs`
* `outputs`
* `props`

This is the canonical contract.
Nothing is inferred from internal wiring.

Changing this interface is a breaking change.

---

## Boundary Adapter Nodes (UI-Only)

To make subnets usable visually, tooling **generates boundary adapter nodes** inside subnets.

These nodes are **structural adapters**: they are always in sync with the subnet signature, do not add logic, and may be regenerated deterministically.
They exist so internal edges have stable anchors.

### Boundary Node Kinds

* `graphInput` — exposes subnet inputs inside the subnet
* `graphOutput` — collects subnet outputs inside the subnet
* `graphProp` — exposes subnet props inside the subnet

### Canonical Boundary Convention

Inside every subnet scope, tooling should ensure the presence of the following reserved boundary nodes:

* `@in` (kind: `graphInput`)
* `@out` (kind: `graphOutput`)
* `@props` (kind: `graphProp`)

Each boundary node exposes **one port per declared signature entry**:

* `@in` exposes **outputs** with port names matching `inputs[].name`
* `@out` exposes **inputs** with port names matching `outputs[].name`
* `@props` exposes **outputs** with port names matching `props[].name`

#### Example

Given subnet signature:

```json
{
  "inputs": [{ "name": "users", "type": "User[]" }],
  "outputs": [{ "name": "adults", "type": "User[]" }],
  "props": [{ "name": "minAge", "type": "number", "value": 18 }]
}
```

Inside the subnet, edges can wire to boundary ports like:

```json
{
  "edges": [
    {
      "src": { "node": "@in", "port": "users" },
      "dst": { "node": "filter", "port": "items" }
    },
    {
      "src": { "node": "@props", "port": "minAge" },
      "dst": { "node": "filter", "port": "minAge" }
    },
    {
      "src": { "node": "filter", "port": "out" },
      "dst": { "node": "@out", "port": "adults" }
    }
  ]
}
```

### Generation Rules

Boundary nodes are generated deterministically from the subnet signature:

| Signature Element | Boundary Node | Port Direction | Boundary Port Name |
| ----------------- | ------------- | -------------- | ------------------ |
| `inputs[i]`       | `@in`         | output         | `inputs[i].name`   |
| `outputs[i]`      | `@out`        | input          | `outputs[i].name`  |
| `props[i]`       | `@props`      | output         | `props[i].name`   |

Boundary nodes may be regenerated at any time and **must not affect identity**.

### Reserved Names / Collision Rules

To avoid collisions with user-authored nodes:

* Node names starting with `@` are **reserved** for system/boundary nodes.
* Users should not create nodes whose name begins with `@`.

This reservation applies to **node names only** — port names such as `users`, `adults`, `minAge` remain freely chosen (subject to uniqueness constraints within their respective lists).

---

## Groups (UI Only)

`groups[]` are optional UI helpers for organizing nodes visually.

They have **no semantic meaning** and should be ignored by execution and hashing if desired.

---

## Metadata

`meta` exists for layout, annotations, and editor state:

* coordinates
* comments
* UI hints

It may be partially or fully excluded from hashing depending on your canonicalization rules.

---

## Validation Rules (Normative)

* Node names must be unique within a scope
* Node names starting with `@` are reserved for system/boundary nodes
* Port names must be unique within:

  * `inputs`
  * `outputs`
  * `props`
* Edges must reference existing ports
* Fan-in requires explicit merge nodes
* Branching requires explicit output ports
* Boundary nodes must match declared signatures 1:1 (ports mirror the subnet signature)

---

## Node Type Convention

The `type` field on a `Node` identifies what kind of processing the node performs.

### Format

```
category:name
```

* **`category`** (required) — domain grouping (e.g. `math`, `const`, `email`, `json`)
* **`name`** (required) — action name within the category (e.g. `add`, `string`, `send`). The name doubles as the HTTP route for HTTP-dispatched nodes.

The **colon** (`:`) separates category from name.
The **slash** (`/`) character is **not allowed** in node type names.

### Examples

```
math:add           — pure math addition
const:string       — constant string value
email:send         — send an email
json:select        — extract a value from JSON
```

### Boundary Nodes

Boundary node types (`graphInput`, `graphOutput`, `graphProp`) are plain identifiers without a category separator. They are reserved system types.

---

## Canonicalization & Merkle Hashing

Recommended practices:

* Sort `inputs`, `outputs`, `props` by name
* Sort `nodes` by name
* Sort `edges` deterministically
* Exclude UI-only metadata if desired
* Regenerate boundary nodes deterministically (`@in`, `@out`, `@props`)

This ensures equivalent graphs hash identically.

---

## Design Philosophy (Summary)

* **No lanes**
* **No inference**
* **No hidden behavior**
* **Folders are graphs**
* **Ports are contracts**
* **Edges are explicit**
* **UI is projection, not truth**

If you understand Houdini networks, this system should feel immediately natural.