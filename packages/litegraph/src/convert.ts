import { Edge, Graph, Node } from '@fbp/types';

import { Litegraph, LitegraphLink, LitegraphNode } from './types';

export function convertToLitegraph(graph: Graph): Litegraph {
  const nodes: LitegraphNode[] = graph.nodes.map((node, index) => ({
    id: index,  // Assign an incremental ID based on the array index
    type: node.type,
    title: node.name,
    // Ensure pos is always a tuple of [number, number]
    pos: [node.meta?.x || 0, node.meta?.y || 0] as [number, number],
    value: node.props?.reduce((acc, prop) => ({ ...acc, [prop.name]: prop.value }), undefined),
    inputs: node.inputs?.map(input => ({
      name: input.name,
      type: input.type,
      link: null as number | null  // Initial null, to be populated in the links processing
    })) ?? [],
    outputs: node.outputs?.map(output => ({
      name: output.name,
      type: output.type,
      links: [] as number[]  // Initial empty array, to be populated in the links processing
    })) ?? []
  }));

  const links: LitegraphLink[] = [];

  // Process each node to find connections
  graph.edges.forEach((edge, edgeIndex) => {
    const srcNodeIndex = nodes.findIndex(n => n.title === edge.src.node);
    const dstNodeIndex = nodes.findIndex(n => n.title === edge.dst.node);

    if (srcNodeIndex !== -1 && dstNodeIndex !== -1) {
      const srcOutputIndex = nodes[srcNodeIndex].outputs.findIndex(output => output.name === edge.src.port);
      const dstInputIndex = nodes[dstNodeIndex].inputs.findIndex(input => input.name === edge.dst.port);

      // Create link
      const link: LitegraphLink = {
        id: edgeIndex,
        origin_id: srcNodeIndex,
        origin_slot: srcOutputIndex,
        target_id: dstNodeIndex,
        target_slot: dstInputIndex
      };
      links.push(link);

      // Update nodes with link information
      nodes[srcNodeIndex].outputs[srcOutputIndex].links.push(edgeIndex);
      nodes[dstNodeIndex].inputs[dstInputIndex].link = edgeIndex;
    }
  });

  return { nodes, links };
}


export function convertFromLitegraph(litegraph: Litegraph): Graph {
  const nodes: Node[] = litegraph.nodes.map(node => {
    const lightNode: Node = {
      name: node.title,
      context: 'litegraph',
      category: 'default',
      type: node.type,
      meta: {
        x: node.pos[0],
        y: node.pos[1]
      },
      inputs: node.inputs?.map(input => ({
        name: input.name,
        type: input.type
      })) || [],
      outputs: node.outputs?.map(output => ({
        name: output.name,
        type: output.type
      })) || [],
      props: node.value ? Object.keys(node.value).map(key => ({
        name: key,
        type: typeof node.value[key], // Assumes all values are singular types
        value: node.value[key]
      })) : []
    };
    return lightNode;
  });

  const edges: Edge[] = litegraph.links.map(link => ({
    src: {
      node: litegraph.nodes[link.origin_id].title,
      port: litegraph.nodes[link.origin_id].outputs[link.origin_slot].name
    },
    dst: {
      node: litegraph.nodes[link.target_id].title,
      port: litegraph.nodes[link.target_id].inputs[link.target_slot].name
    }
  }));

  return {
    name: 'default',
    context: 'litegraph',
    category: 'graph',
    type: 'Graph',
    nodes,
    edges
  };
}
