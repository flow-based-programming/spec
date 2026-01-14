import { Graph } from '@fbp/types';

export const graph: Graph = {
  name: 'default',
  context: 'litegraph',
  category: 'graph',
  type: 'Graph',
  nodes: [
    {
      name: 'add1',
      context: 'litegraph',
      category: 'default',
      type: 'js/math/add',
      inputs: [
        {
          name: 'A',
          type: 'number',
        },
        {
          name: 'B',
          type: 'number',
        },
      ],
      meta: {
        x: 100,
        y: 100,
      },
      outputs: [
        {
          name: 'Sum',
          type: 'number',
        },
      ],
      params: [],
    },
    {
      name: 'mult1',
      context: 'litegraph',
      category: 'default',
      type: 'js/math/mult',
      inputs: [
        {
          name: 'Sum',
          type: 'number',
        },
        {
          name: 'C',
          type: 'number',
        },
      ],
      meta: {
        x: 300,
        y: 100,
      },
      outputs: [
        {
          name: 'Product',
          type: 'number',
        },
      ],
      params: [],
    }
  ],
  edges: [
    {
      src: {
        node: 'add1',
        port: 'Sum'
      },
      dst: {
        node: 'mult1',
        port: 'Sum'
      }
    }
  ]
};
