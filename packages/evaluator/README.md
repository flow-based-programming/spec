# @fbp/evaluator

Lazy graph evaluator for Flow-Based Programming.

## Installation

```bash
pnpm add @fbp/evaluator
```

## Usage

```typescript
import { evaluate } from '@fbp/evaluator';
import type { Graph } from '@fbp/types';
import type { NodeDefinitionWithImpl } from '@fbp/evaluator';

// Define node implementations
const addDef: NodeDefinitionWithImpl = {
  context: 'js',
  category: 'math',
  type: 'js/math/add',
  inputs: [
    { name: 'a', type: 'number' },
    { name: 'b', type: 'number' }
  ],
  outputs: [{ name: 'sum', type: 'number' }],
  impl: (inputs) => ({
    sum: (inputs.a ?? 0) + (inputs.b ?? 0)
  })
};

// Create a graph
const graph: Graph = {
  name: 'simple-add',
  nodes: [
    { name: 'num1', type: 'js/const/number', props: [{ name: 'value', type: 'number', value: 5 }] },
    { name: 'num2', type: 'js/const/number', props: [{ name: 'value', type: 'number', value: 3 }] },
    { name: 'add', type: 'js/math/add' }
  ],
  edges: [
    { src: { node: 'num1', port: 'value' }, dst: { node: 'add', port: 'a' } },
    { src: { node: 'num2', port: 'value' }, dst: { node: 'add', port: 'b' } }
  ]
};

// Evaluate the graph
const result = evaluate(graph, {
  definitions: [constNumberDef, addDef],
  outputNode: 'add',
  outputPort: 'sum'
});

console.log(result); // 8
```

## Features

- **Lazy evaluation**: Only evaluates nodes that are needed for the output
- **Multi-input ports**: Supports ports that accept multiple incoming edges (values collected in edge array order)
- **Boundary nodes**: Supports `@in:`, `@out:`, and `@prop:` boundary nodes for graph inputs/outputs/props

## API

### `evaluate(graph, options)`

Evaluates a graph starting from the specified output node/port.

**Parameters:**
- `graph: Graph` - The graph to evaluate
- `options: EvaluateOptions` - Evaluation options
  - `definitions: NodeDefinitionWithImpl[]` - Node definitions with implementations
  - `outputNode: string` - The node to get output from
  - `outputPort: string` - The port to get output from
  - `inputs?: Record<string, any>` - External inputs for `@in:` nodes
  - `props?: Record<string, any>` - Props for `@prop:` nodes

**Returns:** The value at the specified output port
