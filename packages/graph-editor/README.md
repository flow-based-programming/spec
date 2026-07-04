# @fbp/graph-editor

A Houdini-inspired graph editor for Flow-Based Programming built with React, SVG, and Tailwind CSS.

## Features

- **SVG-based canvas** with pan/zoom support
- **Node rendering** with `category:name` type identifiers (e.g., `math:add`)
- **Bezier edge connections** between ports
- **Selection system** with box select, shift-add/remove, and Cmd+D duplicate
- **Properties panel** auto-generated from `PropDefinition`
- **Subgraph navigation** with Enter to dive and U to go up
- **Channel reference detection** for `ch("...")` and `$VAR` patterns

## Installation

```bash
pnpm add @fbp/graph-editor
```

## Usage

```tsx
import { GraphEditor } from '@fbp/graph-editor';
import type { Graph, NodeDefinition } from '@fbp/types';

const graph: Graph = {
  name: 'my-graph',
  definitions: [
    {
      context: 'js',
      category: 'math',
      name: 'add',
      inputs: [
        { name: 'a', type: 'number' },
        { name: 'b', type: 'number' }
      ],
      outputs: [
        { name: 'sum', type: 'number' }
      ]
    }
  ],
  nodes: [
    { name: 'add1', type: 'math:add', meta: { x: 100, y: 100 } }
  ],
  edges: []
};

function App() {
  return (
    <div className="h-screen">
      <GraphEditor graph={graph} />
    </div>
  );
}
```

## Keyboard Shortcuts

- **Delete/Backspace** - Delete selected nodes/edges
- **Cmd/Ctrl+D** - Duplicate selection
- **Cmd/Ctrl+A** - Select all
- **Escape** - Clear selection
- **Enter** - Dive into selected subnet
- **U** - Go up from subnet
- **Shift+Drag** - Box select
- **Alt+Drag** or **Middle Mouse** - Pan canvas
- **Ctrl/Cmd+Scroll** - Zoom

## License

MIT
