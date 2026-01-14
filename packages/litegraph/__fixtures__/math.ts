import { Graph } from '@fbp/types';

export const graph: Graph = {
  name: 'default',
  context: 'js',
  category: 'graph',
  type: 'Graph',
  nodes: [
    {
      name: 'num1',
      context: 'js',
      category: 'const',
      type: 'js/const/number',
      meta: {
        x: 50,
        y: 200,
      },
      outputs: [
        {
          name: 'num',
          type: 'number',
        },
      ],
    },
    {
      name: 'num2',
      context: 'js',
      category: 'const',
      type: 'js/const/number',
      meta: {
        x: 350,
        y: 200,
      },
      outputs: [
        {
          name: 'num',
          type: 'number',
        },
      ],
    },
    {
      name: 'add1',
      context: 'js',
      category: 'math',
      type: 'js/math/add',
      inputs: [
        {
          name: 'a',
          type: 'number',
        },
        {
          name: 'b',
          type: 'number',
        },
      ],
      meta: {
        x: 100,
        y: 100,
      },
      outputs: [
        {
          name: 'sum',
          type: 'number',
        },
      ],
    },
    {
      name: 'mult1',
      context: 'js',
      category: 'math',
      type: 'js/math/mult',
      inputs: [
        {
          name: 'a',
          type: 'number',
        },
        {
          name: 'b',
          type: 'number',
        },
      ],
      meta: {
        x: 300,
        y: 100,
      },
      outputs: [
        {
          name: 'product',
          type: 'number',
        },
      ],
    }
  ],
  edges: [
    {
      src: {
        node: 'num1',
        port: 'num'
      },
      dst: {
        node: 'add1',
        port: 'b'
      }
    },
    {
      src: {
        node: 'num2',
        port: 'num'
      },
      dst: {
        node: 'add1',
        port: 'b'
      }
    },
    {
      src: {
        node: 'add1',
        port: 'sum'
      },
      dst: {
        node: 'mult1',
        port: 'a'
      }
    },
    {
      src: {
        node: 'num1',
        port: 'num'
      },
      dst: {
        node: 'mult1',
        port: 'b'
      }
    }
  ]
};