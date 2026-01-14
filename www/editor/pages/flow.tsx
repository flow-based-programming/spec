import React from 'react';
import FlowGraph from '../graph/flow-graph';
import { NumberNode } from '../graph/nodes/const/number';
import { AddNode } from '../graph/nodes/math/add';
import { MultNode } from '../graph/nodes/math/mult';

import { Footer, Header, Hero, Layout } from "@/components";
import { Box, Text } from "@interchain-ui/react";

import { Graph } from '@fbp/types'
import { convertToLitegraph } from '@fbp/litegraph'
import { LGraph, LiteGraph } from 'litegraph.js';


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
        x: 100,
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
        x: 250,
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
        x: 400,
        y: 200,
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
        x: 550,
        y: 200,
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

export default function Flow() {
  const nodeDefinitions = [
    AddNode.register,
    MultNode.register,
    NumberNode.register
  ];

  // Example of initial graph data
  const initialGraphData = convertToLitegraph(graph);
  return (
    // @ts-ignore
    <Layout>
       {/* @ts-ignore */}
      <Box mt="$12">
       {/* @ts-ignore */}
      <FlowGraph nodeDefinitions={nodeDefinitions} initialGraphData={initialGraphData} />
      </Box>
    </Layout>
  );
}
