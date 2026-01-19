import type { Graph, Node, Edge, Port } from '@fbp/types';
import type { NodeDefinitionWithImpl, EvaluateOptions } from './types';

/**
 * Evaluate a graph starting from the specified output node/port.
 * Uses lazy evaluation - only evaluates nodes that are needed for the output.
 * Fully async to support async node implementations.
 * 
 * @param graph - The graph to evaluate
 * @param options - Evaluation options including definitions, output node/port, and external inputs
 * @returns Promise resolving to the value at the specified output port
 */
export async function evaluate(graph: Graph, options: EvaluateOptions): Promise<any> {
  const { definitions, outputNode, outputPort, inputs = {}, props = {} } = options;

  // Build lookup maps
  const nodeMap = new Map<string, Node>();
  for (const node of graph.nodes) {
    nodeMap.set(node.name, node);
  }

  const defMap = new Map<string, NodeDefinitionWithImpl>();
  for (const def of definitions) {
    defMap.set(def.type, def);
  }

  // Build edge lookup: destination node -> destination port -> edges (in array order)
  const edgesByDst = new Map<string, Map<string, Edge[]>>();
  for (const edge of graph.edges) {
    const dstNode = edge.dst.node;
    const dstPort = edge.dst.port;
    
    if (!edgesByDst.has(dstNode)) {
      edgesByDst.set(dstNode, new Map());
    }
    const portMap = edgesByDst.get(dstNode)!;
    if (!portMap.has(dstPort)) {
      portMap.set(dstPort, []);
    }
    portMap.get(dstPort)!.push(edge);
  }

  // Cache for evaluated node outputs to avoid re-evaluation
  const cache = new Map<string, Record<string, any>>();

  /**
   * Recursively evaluate a node and return all its outputs.
   * Fully async to support async node implementations.
   */
  async function evaluateNode(nodeName: string): Promise<Record<string, any>> {
    // Check cache first
    if (cache.has(nodeName)) {
      return cache.get(nodeName)!;
    }

    const node = nodeMap.get(nodeName);
    if (!node) {
      throw new Error(`Node not found: ${nodeName}`);
    }

    // Handle special boundary nodes (@in:, @out:, @prop:)
    if (nodeName.startsWith('@in:')) {
      const inputName = nodeName.slice(4); // Remove '@in:' prefix
      // Check external inputs first, then fall back to node's default prop
      let value = inputs[inputName];
      if (value === undefined) {
        const defaultProp = node.props?.find(p => p.name === 'default');
        value = defaultProp?.value;
      }
      const result = { value };
      cache.set(nodeName, result);
      return result;
    }

    if (nodeName.startsWith('@prop:')) {
      const propName = nodeName.slice(6); // Remove '@prop:' prefix
      const value = props[propName];
      const result = { value };
      cache.set(nodeName, result);
      return result;
    }

    // Handle subnet nodes (kind: 'subnet')
    if (node.kind === 'subnet' && node.nodes && node.edges) {
      // Collect inputs for the subnet by evaluating upstream nodes
      const subnetInputs: Record<string, any> = {};
      const subnetPortEdges = edgesByDst.get(nodeName);
      
      if (node.inputs && subnetPortEdges) {
        for (const inputPort of node.inputs) {
          const edges = subnetPortEdges.get(inputPort.name) ?? [];
          if (edges.length > 0) {
            const edge = edges[0];
            const upstreamOutputs = await evaluateNode(edge.src.node);
            subnetInputs[inputPort.name] = upstreamOutputs[edge.src.port];
          }
        }
      }
      
      // Find the output boundary nodes in the subnet
      const subnetOutputs: Record<string, any> = {};
      
      if (node.outputs) {
        for (const outputPort of node.outputs) {
          // The output boundary node name is @out:<portName>
          const outputNodeName = `@out:${outputPort.name}`;
          
          // Recursively evaluate the subnet's internal graph
          const subnetResult = await evaluate(
            {
              name: `${nodeName}_subnet`,
              nodes: node.nodes,
              edges: node.edges
            },
            {
              definitions,
              outputNode: outputNodeName,
              outputPort: 'value',
              inputs: subnetInputs
            }
          );
          
          subnetOutputs[outputPort.name] = subnetResult;
        }
      }
      
      cache.set(nodeName, subnetOutputs);
      return subnetOutputs;
    }

    // Get the definition for this node type
    const definition = defMap.get(node.type);
    if (!definition) {
      throw new Error(`No definition found for node type: ${node.type}`);
    }

    if (!definition.impl) {
      throw new Error(`No implementation found for node type: ${node.type}`);
    }

    // Collect inputs by evaluating upstream nodes
    const nodeInputs: Record<string, any> = {};
    const portEdges = edgesByDst.get(nodeName);

    if (definition.inputs) {
      for (const inputPort of definition.inputs) {
        const edges = portEdges?.get(inputPort.name) ?? [];
        
        if (inputPort.multi) {
          // Multi-input port: collect all values in edge array order
          const values = await Promise.all(edges.map(async edge => {
            const upstreamOutputs = await evaluateNode(edge.src.node);
            return upstreamOutputs[edge.src.port];
          }));
          nodeInputs[inputPort.name] = values;
        } else {
          // Single input: take first edge if exists
          if (edges.length > 0) {
            const edge = edges[0];
            const upstreamOutputs = await evaluateNode(edge.src.node);
            nodeInputs[inputPort.name] = upstreamOutputs[edge.src.port];
          }
        }
      }
    }

    // Get props from node instance
    const nodeProps: Record<string, any> = {};
    if (definition.props) {
      for (const propDef of definition.props) {
        // First check node instance props
        const instanceProp = node.props?.find(p => p.name === propDef.name);
        if (instanceProp !== undefined && instanceProp.value !== undefined) {
          nodeProps[propDef.name] = instanceProp.value;
        } else if (propDef.default !== undefined) {
          // Fall back to definition default
          nodeProps[propDef.name] = propDef.default;
        }
      }
    }

    // Call the implementation (await in case it's async)
    const outputs = await definition.impl(nodeInputs, nodeProps);
    
    // Cache and return
    cache.set(nodeName, outputs);
    return outputs;
  }

  // Evaluate starting from the output node
  const outputs = await evaluateNode(outputNode);
  return outputs[outputPort];
}
