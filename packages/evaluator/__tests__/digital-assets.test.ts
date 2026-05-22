import type { Graph } from '@fbp/types';
import { evaluate } from '../src/evaluate';
import { mathDefinitions, constNumberDef, addDef, multiplyDef } from '../__fixtures__/math-definitions';
import type { NodeDefinitionWithImpl } from '../src/types';

describe('digital assets', () => {
  describe('basic digital asset (composite node with graph)', () => {
    // A "double" digital asset: takes a number, multiplies it by 2
    const doubleDef: NodeDefinitionWithImpl = {
      type: 'math/double',
      category: 'math',
      inputs: [{ name: 'x', type: 'number' }],
      outputs: [{ name: 'result', type: 'number' }],
      graph: {
        name: 'double-internal',
        nodes: [
          { name: 'input_x', type: 'graphInput', props: [{ name: 'portName', type: 'string', value: 'x' }] },
          { name: 'two', type: 'const/number', props: [{ name: 'value', type: 'number', value: 2 }] },
          { name: 'mul', type: 'math/multiply' },
          { name: 'output_result', type: 'graphOutput', props: [{ name: 'portName', type: 'string', value: 'result' }] }
        ],
        edges: [
          { src: { node: 'input_x', port: 'value' }, dst: { node: 'mul', port: 'a' } },
          { src: { node: 'two', port: 'value' }, dst: { node: 'mul', port: 'b' } },
          { src: { node: 'mul', port: 'product' }, dst: { node: 'output_result', port: 'value' } }
        ]
      }
    };

    const allDefs = [...mathDefinitions, doubleDef];

    it('should evaluate a digital asset node', async () => {
      const graph: Graph = {
        name: 'use-double',
        nodes: [
          { name: 'num', type: 'const/number', props: [{ name: 'value', type: 'number', value: 7 }] },
          { name: 'dbl', type: 'math/double' }
        ],
        edges: [
          { src: { node: 'num', port: 'value' }, dst: { node: 'dbl', port: 'x' } }
        ]
      };

      const result = await evaluate(graph, {
        definitions: allDefs,
        outputNode: 'dbl',
        outputPort: 'result'
      });

      // 7 * 2 = 14
      expect(result).toBe(14);
    });

    it('should chain digital assets with leaf nodes', async () => {
      const graph: Graph = {
        name: 'double-then-add',
        nodes: [
          { name: 'num1', type: 'const/number', props: [{ name: 'value', type: 'number', value: 5 }] },
          { name: 'num2', type: 'const/number', props: [{ name: 'value', type: 'number', value: 3 }] },
          { name: 'dbl', type: 'math/double' },
          { name: 'add', type: 'math/add' }
        ],
        edges: [
          { src: { node: 'num1', port: 'value' }, dst: { node: 'dbl', port: 'x' } },
          { src: { node: 'dbl', port: 'result' }, dst: { node: 'add', port: 'a' } },
          { src: { node: 'num2', port: 'value' }, dst: { node: 'add', port: 'b' } }
        ]
      };

      const result = await evaluate(graph, {
        definitions: allDefs,
        outputNode: 'add',
        outputPort: 'sum'
      });

      // (5 * 2) + 3 = 13
      expect(result).toBe(13);
    });
  });

  describe('digital asset with promoted parameters (graphProp)', () => {
    // A "weighted-add" digital asset: a*weight_a + b*weight_b
    const weightedAddDef: NodeDefinitionWithImpl = {
      type: 'math/weighted-add',
      category: 'math',
      inputs: [
        { name: 'a', type: 'number' },
        { name: 'b', type: 'number' }
      ],
      outputs: [{ name: 'result', type: 'number' }],
      props: [
        { name: 'weight_a', type: 'number', default: 1.0 },
        { name: 'weight_b', type: 'number', default: 1.0 }
      ],
      graph: {
        name: 'weighted-add-internal',
        nodes: [
          // Boundary nodes
          { name: 'in_a', type: 'graphInput', props: [{ name: 'portName', type: 'string', value: 'a' }] },
          { name: 'in_b', type: 'graphInput', props: [{ name: 'portName', type: 'string', value: 'b' }] },
          { name: 'p_wa', type: 'graphProp', props: [{ name: 'propName', type: 'string', value: 'weight_a' }] },
          { name: 'p_wb', type: 'graphProp', props: [{ name: 'propName', type: 'string', value: 'weight_b' }] },
          { name: 'out', type: 'graphOutput', props: [{ name: 'portName', type: 'string', value: 'result' }] },
          // Computation
          { name: 'mul_a', type: 'math/multiply' },
          { name: 'mul_b', type: 'math/multiply' },
          { name: 'sum', type: 'math/add' }
        ],
        edges: [
          { src: { node: 'in_a', port: 'value' }, dst: { node: 'mul_a', port: 'a' } },
          { src: { node: 'p_wa', port: 'value' }, dst: { node: 'mul_a', port: 'b' } },
          { src: { node: 'in_b', port: 'value' }, dst: { node: 'mul_b', port: 'a' } },
          { src: { node: 'p_wb', port: 'value' }, dst: { node: 'mul_b', port: 'b' } },
          { src: { node: 'mul_a', port: 'product' }, dst: { node: 'sum', port: 'a' } },
          { src: { node: 'mul_b', port: 'product' }, dst: { node: 'sum', port: 'b' } },
          { src: { node: 'sum', port: 'sum' }, dst: { node: 'out', port: 'value' } }
        ]
      }
    };

    const allDefs = [...mathDefinitions, weightedAddDef];

    it('should use default parameter values', async () => {
      const graph: Graph = {
        name: 'weighted-add-defaults',
        nodes: [
          { name: 'a', type: 'const/number', props: [{ name: 'value', type: 'number', value: 10 }] },
          { name: 'b', type: 'const/number', props: [{ name: 'value', type: 'number', value: 20 }] },
          { name: 'wadd', type: 'math/weighted-add' }
        ],
        edges: [
          { src: { node: 'a', port: 'value' }, dst: { node: 'wadd', port: 'a' } },
          { src: { node: 'b', port: 'value' }, dst: { node: 'wadd', port: 'b' } }
        ]
      };

      const result = await evaluate(graph, {
        definitions: allDefs,
        outputNode: 'wadd',
        outputPort: 'result'
      });

      // 10*1.0 + 20*1.0 = 30
      expect(result).toBe(30);
    });

    it('should override parameters per-instance via props', async () => {
      const graph: Graph = {
        name: 'weighted-add-custom',
        nodes: [
          { name: 'a', type: 'const/number', props: [{ name: 'value', type: 'number', value: 10 }] },
          { name: 'b', type: 'const/number', props: [{ name: 'value', type: 'number', value: 20 }] },
          { name: 'wadd', type: 'math/weighted-add', props: [
            { name: 'weight_a', type: 'number', value: 0.7 },
            { name: 'weight_b', type: 'number', value: 0.3 }
          ]}
        ],
        edges: [
          { src: { node: 'a', port: 'value' }, dst: { node: 'wadd', port: 'a' } },
          { src: { node: 'b', port: 'value' }, dst: { node: 'wadd', port: 'b' } }
        ]
      };

      const result = await evaluate(graph, {
        definitions: allDefs,
        outputNode: 'wadd',
        outputPort: 'result'
      });

      // 10*0.7 + 20*0.3 = 7 + 6 = 13
      expect(result).toBe(13);
    });

    it('should allow multiple instances with different parameters', async () => {
      const graph: Graph = {
        name: 'two-weighted-adds',
        nodes: [
          { name: 'a', type: 'const/number', props: [{ name: 'value', type: 'number', value: 10 }] },
          { name: 'b', type: 'const/number', props: [{ name: 'value', type: 'number', value: 20 }] },
          // Instance 1: weight_a=2, weight_b=3
          { name: 'wadd1', type: 'math/weighted-add', props: [
            { name: 'weight_a', type: 'number', value: 2 },
            { name: 'weight_b', type: 'number', value: 3 }
          ]},
          // Instance 2: weight_a=0.5, weight_b=0.5
          { name: 'wadd2', type: 'math/weighted-add', props: [
            { name: 'weight_a', type: 'number', value: 0.5 },
            { name: 'weight_b', type: 'number', value: 0.5 }
          ]},
          { name: 'final_add', type: 'math/add' }
        ],
        edges: [
          { src: { node: 'a', port: 'value' }, dst: { node: 'wadd1', port: 'a' } },
          { src: { node: 'b', port: 'value' }, dst: { node: 'wadd1', port: 'b' } },
          { src: { node: 'a', port: 'value' }, dst: { node: 'wadd2', port: 'a' } },
          { src: { node: 'b', port: 'value' }, dst: { node: 'wadd2', port: 'b' } },
          { src: { node: 'wadd1', port: 'result' }, dst: { node: 'final_add', port: 'a' } },
          { src: { node: 'wadd2', port: 'result' }, dst: { node: 'final_add', port: 'b' } }
        ]
      };

      const result1 = await evaluate(graph, {
        definitions: allDefs,
        outputNode: 'wadd1',
        outputPort: 'result'
      });
      // 10*2 + 20*3 = 20 + 60 = 80
      expect(result1).toBe(80);

      const result2 = await evaluate(graph, {
        definitions: allDefs,
        outputNode: 'wadd2',
        outputPort: 'result'
      });
      // 10*0.5 + 20*0.5 = 5 + 10 = 15
      expect(result2).toBe(15);

      const result3 = await evaluate(graph, {
        definitions: allDefs,
        outputNode: 'final_add',
        outputPort: 'sum'
      });
      // 80 + 15 = 95
      expect(result3).toBe(95);
    });
  });

  describe('nested digital assets (asset using another asset)', () => {
    // "double" asset: x * 2
    const doubleDef: NodeDefinitionWithImpl = {
      type: 'math/double',
      category: 'math',
      inputs: [{ name: 'x', type: 'number' }],
      outputs: [{ name: 'result', type: 'number' }],
      graph: {
        name: 'double-internal',
        nodes: [
          { name: 'input_x', type: 'graphInput', props: [{ name: 'portName', type: 'string', value: 'x' }] },
          { name: 'two', type: 'const/number', props: [{ name: 'value', type: 'number', value: 2 }] },
          { name: 'mul', type: 'math/multiply' },
          { name: 'output_result', type: 'graphOutput', props: [{ name: 'portName', type: 'string', value: 'result' }] }
        ],
        edges: [
          { src: { node: 'input_x', port: 'value' }, dst: { node: 'mul', port: 'a' } },
          { src: { node: 'two', port: 'value' }, dst: { node: 'mul', port: 'b' } },
          { src: { node: 'mul', port: 'product' }, dst: { node: 'output_result', port: 'value' } }
        ]
      }
    };

    // "quadruple" asset: uses math/double twice (double of double)
    const quadrupleDef: NodeDefinitionWithImpl = {
      type: 'math/quadruple',
      category: 'math',
      inputs: [{ name: 'x', type: 'number' }],
      outputs: [{ name: 'result', type: 'number' }],
      graph: {
        name: 'quadruple-internal',
        nodes: [
          { name: 'input_x', type: 'graphInput', props: [{ name: 'portName', type: 'string', value: 'x' }] },
          { name: 'dbl1', type: 'math/double' },
          { name: 'dbl2', type: 'math/double' },
          { name: 'output_result', type: 'graphOutput', props: [{ name: 'portName', type: 'string', value: 'result' }] }
        ],
        edges: [
          { src: { node: 'input_x', port: 'value' }, dst: { node: 'dbl1', port: 'x' } },
          { src: { node: 'dbl1', port: 'result' }, dst: { node: 'dbl2', port: 'x' } },
          { src: { node: 'dbl2', port: 'result' }, dst: { node: 'output_result', port: 'value' } }
        ]
      }
    };

    const allDefs = [...mathDefinitions, doubleDef, quadrupleDef];

    it('should evaluate nested digital assets', async () => {
      const graph: Graph = {
        name: 'use-quadruple',
        nodes: [
          { name: 'num', type: 'const/number', props: [{ name: 'value', type: 'number', value: 3 }] },
          { name: 'quad', type: 'math/quadruple' }
        ],
        edges: [
          { src: { node: 'num', port: 'value' }, dst: { node: 'quad', port: 'x' } }
        ]
      };

      const result = await evaluate(graph, {
        definitions: allDefs,
        outputNode: 'quad',
        outputPort: 'result'
      });

      // 3 * 2 * 2 = 12
      expect(result).toBe(12);
    });
  });

  describe('digital asset with inline definitions', () => {
    it('should use definitions from the graph.definitions array', async () => {
      // Define the digital asset as a graph-level inline definition
      const graph: Graph = {
        name: 'inline-def-graph',
        definitions: [
          {
            type: 'math/triple',
            category: 'math',
            inputs: [{ name: 'x', type: 'number' }],
            outputs: [{ name: 'result', type: 'number' }],
            graph: {
              name: 'triple-internal',
              nodes: [
                { name: 'input_x', type: 'graphInput', props: [{ name: 'portName', type: 'string', value: 'x' }] },
                { name: 'three', type: 'const/number', props: [{ name: 'value', type: 'number', value: 3 }] },
                { name: 'mul', type: 'math/multiply' },
                { name: 'output_result', type: 'graphOutput', props: [{ name: 'portName', type: 'string', value: 'result' }] }
              ],
              edges: [
                { src: { node: 'input_x', port: 'value' }, dst: { node: 'mul', port: 'a' } },
                { src: { node: 'three', port: 'value' }, dst: { node: 'mul', port: 'b' } },
                { src: { node: 'mul', port: 'product' }, dst: { node: 'output_result', port: 'value' } }
              ]
            }
          }
        ],
        nodes: [
          { name: 'num', type: 'const/number', props: [{ name: 'value', type: 'number', value: 5 }] },
          { name: 'trip', type: 'math/triple' }
        ],
        edges: [
          { src: { node: 'num', port: 'value' }, dst: { node: 'trip', port: 'x' } }
        ]
      };

      // Merge graph.definitions into the definitions array
      const inlineDefs = (graph.definitions || []).map(d => d as NodeDefinitionWithImpl);
      const allDefs = [...mathDefinitions, ...inlineDefs];

      const result = await evaluate(graph, {
        definitions: allDefs,
        outputNode: 'trip',
        outputPort: 'result'
      });

      // 5 * 3 = 15
      expect(result).toBe(15);
    });
  });

  describe('error handling', () => {
    it('should throw if digital asset has no output boundary nodes', async () => {
      const emptyAssetDef: NodeDefinitionWithImpl = {
        type: 'broken/empty',
        inputs: [{ name: 'x', type: 'number' }],
        outputs: [{ name: 'result', type: 'number' }],
        graph: {
          name: 'empty-internal',
          nodes: [
            { name: 'input_x', type: 'graphInput', props: [{ name: 'portName', type: 'string', value: 'x' }] }
          ],
          edges: []
        }
      };

      const graph: Graph = {
        name: 'use-empty',
        nodes: [
          { name: 'num', type: 'const/number', props: [{ name: 'value', type: 'number', value: 5 }] },
          { name: 'empty', type: 'broken/empty' }
        ],
        edges: [
          { src: { node: 'num', port: 'value' }, dst: { node: 'empty', port: 'x' } }
        ]
      };

      const result = await evaluate(graph, {
        definitions: [...mathDefinitions, emptyAssetDef],
        outputNode: 'empty',
        outputPort: 'result'
      });

      // No graphOutput nodes → result is undefined
      expect(result).toBeUndefined();
    });

    it('should throw if leaf node has no impl', async () => {
      const noImplDef: NodeDefinitionWithImpl = {
        type: 'broken/no-impl',
        inputs: [{ name: 'x', type: 'number' }],
        outputs: [{ name: 'result', type: 'number' }]
        // No impl, no graph
      };

      const graph: Graph = {
        name: 'use-no-impl',
        nodes: [
          { name: 'num', type: 'const/number', props: [{ name: 'value', type: 'number', value: 5 }] },
          { name: 'broken', type: 'broken/no-impl' }
        ],
        edges: [
          { src: { node: 'num', port: 'value' }, dst: { node: 'broken', port: 'x' } }
        ]
      };

      await expect(evaluate(graph, {
        definitions: [...mathDefinitions, noImplDef],
        outputNode: 'broken',
        outputPort: 'result'
      })).rejects.toThrow('No implementation found for node type: broken/no-impl');
    });
  });
});
