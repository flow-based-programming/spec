import React from 'react';
import { GraphEditor } from '@fbp/graph-editor';
import type { Graph } from '@fbp/types';

export const graph: Graph = {
  name: 'demo',
  definitions: [
    {
      context: 'js',
      category: 'const',
      name: 'number',
      outputs: [{ name: 'value', type: 'number' }],
      props: [
        { name: 'value', type: 'number', default: 0, description: 'The constant value' }
      ],
    },
    {
      context: 'js',
      category: 'math',
      name: 'add',
      inputs: [
        { name: 'a', type: 'number' },
        { name: 'b', type: 'number' },
      ],
      outputs: [{ name: 'sum', type: 'number' }],
    },
    {
      context: 'js',
      category: 'math',
      name: 'multiply',
      inputs: [
        { name: 'a', type: 'number' },
        { name: 'b', type: 'number' },
      ],
      outputs: [{ name: 'product', type: 'number' }],
    },
  ],
  nodes: [
    { name: 'num1', type: 'number', meta: { x: 100, y: 100 } },
    { name: 'num2', type: 'number', meta: { x: 100, y: 250 } },
    { name: 'add1', type: 'add', meta: { x: 350, y: 150 } },
    { name: 'mult1', type: 'multiply', meta: { x: 600, y: 150 } },
  ],
  edges: [
    { src: { node: 'num1', port: 'value' }, dst: { node: 'add1', port: 'a' } },
    { src: { node: 'num2', port: 'value' }, dst: { node: 'add1', port: 'b' } },
    { src: { node: 'add1', port: 'sum' }, dst: { node: 'mult1', port: 'a' } },
    { src: { node: 'num1', port: 'value' }, dst: { node: 'mult1', port: 'b' } },
  ],
};

export default function Flow() {
  return (
    <div className="h-screen w-screen">
      <GraphEditor graph={graph} />
    </div>
  );
}
