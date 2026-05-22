import type { Graph } from '@fbp/types';
import { evaluate } from '../src/evaluate';
import { mathDefinitions, constNumberDef, addDef, multiplyDef } from '../__fixtures__/math-definitions';
import { uiDefinitions, pageDef, formDef, inputDef, buttonDef, textDef } from '../__fixtures__/ui-definitions';

describe('evaluate', () => {
  describe('math operations', () => {
    it('should evaluate a simple add graph', async () => {
      const graph: Graph = {
        name: 'simple-add',
        nodes: [
          { name: 'num1', type: 'const/number', props: [{ name: 'value', type: 'number', value: 5 }] },
          { name: 'num2', type: 'const/number', props: [{ name: 'value', type: 'number', value: 3 }] },
          { name: 'add', type: 'math/add' }
        ],
        edges: [
          { src: { node: 'num1', port: 'value' }, dst: { node: 'add', port: 'a' } },
          { src: { node: 'num2', port: 'value' }, dst: { node: 'add', port: 'b' } }
        ]
      };

      const result = await evaluate(graph, {
        definitions: mathDefinitions,
        outputNode: 'add',
        outputPort: 'sum'
      });

      expect(result).toBe(8);
    });

    it('should evaluate a chained math graph (add then multiply)', async () => {
      const graph: Graph = {
        name: 'chained-math',
        nodes: [
          { name: 'num1', type: 'const/number', props: [{ name: 'value', type: 'number', value: 2 }] },
          { name: 'num2', type: 'const/number', props: [{ name: 'value', type: 'number', value: 3 }] },
          { name: 'num3', type: 'const/number', props: [{ name: 'value', type: 'number', value: 4 }] },
          { name: 'add', type: 'math/add' },
          { name: 'multiply', type: 'math/multiply' }
        ],
        edges: [
          { src: { node: 'num1', port: 'value' }, dst: { node: 'add', port: 'a' } },
          { src: { node: 'num2', port: 'value' }, dst: { node: 'add', port: 'b' } },
          { src: { node: 'add', port: 'sum' }, dst: { node: 'multiply', port: 'a' } },
          { src: { node: 'num3', port: 'value' }, dst: { node: 'multiply', port: 'b' } }
        ]
      };

      const result = await evaluate(graph, {
        definitions: mathDefinitions,
        outputNode: 'multiply',
        outputPort: 'product'
      });

      // (2 + 3) * 4 = 20
      expect(result).toBe(20);
    });

    it('should use lazy evaluation (only evaluate needed nodes)', async () => {
      const evaluatedNodes: string[] = [];
      
      // Create definitions that track which nodes are evaluated
      const trackingDefs = mathDefinitions.map(def => ({
        ...def,
        impl: (inputs: Record<string, any>, props: Record<string, any>) => {
          evaluatedNodes.push(def.type);
          return def.impl!(inputs, props);
        }
      }));

      const graph: Graph = {
        name: 'lazy-test',
        nodes: [
          { name: 'num1', type: 'const/number', props: [{ name: 'value', type: 'number', value: 5 }] },
          { name: 'num2', type: 'const/number', props: [{ name: 'value', type: 'number', value: 3 }] },
          { name: 'unused', type: 'const/number', props: [{ name: 'value', type: 'number', value: 999 }] },
          { name: 'add', type: 'math/add' }
        ],
        edges: [
          { src: { node: 'num1', port: 'value' }, dst: { node: 'add', port: 'a' } },
          { src: { node: 'num2', port: 'value' }, dst: { node: 'add', port: 'b' } }
          // Note: 'unused' node is not connected to anything
        ]
      };

      await evaluate(graph, {
        definitions: trackingDefs,
        outputNode: 'add',
        outputPort: 'sum'
      });

      // 'unused' node should NOT be evaluated
      expect(evaluatedNodes).toContain('const/number');
      expect(evaluatedNodes).toContain('math/add');
      expect(evaluatedNodes.filter(n => n === 'const/number').length).toBe(2); // Only num1 and num2
    });
  });

  describe('UI vdom generation', () => {
    it('should generate a simple page vdom', async () => {
      const graph: Graph = {
        name: 'simple-page',
        nodes: [
          { 
            name: 'page', 
            type: 'ui/layout/Page', 
            props: [
              { name: 'key', type: 'string', value: 'home' },
              { name: 'className', type: 'string', value: 'min-h-screen' }
            ] 
          }
        ],
        edges: []
      };

      const result = await evaluate(graph, {
        definitions: uiDefinitions,
        outputNode: 'page',
        outputPort: 'element'
      });

      expect(result).toEqual({
        type: 'Page',
        key: 'home',
        props: { className: 'min-h-screen' },
        children: []
      });
    });

    it('should generate a form with children using edge array order', async () => {
      const graph: Graph = {
        name: 'form-with-children',
        nodes: [
          { 
            name: 'form', 
            type: 'ui/form/Form', 
            props: [
              { name: 'key', type: 'string', value: 'myForm' },
              { name: 'className', type: 'string', value: 'flex gap-4' }
            ] 
          },
          { 
            name: 'emailInput', 
            type: 'ui/form/Input', 
            props: [
              { name: 'key', type: 'string', value: 'email' },
              { name: 'name', type: 'string', value: 'email' },
              { name: 'type', type: 'string', value: 'email' },
              { name: 'placeholder', type: 'string', value: 'Enter email' }
            ] 
          },
          { 
            name: 'submitButton', 
            type: 'ui/form/Button', 
            props: [
              { name: 'key', type: 'string', value: 'submit' },
              { name: 'type', type: 'string', value: 'submit' },
              { name: 'text', type: 'string', value: 'Subscribe' }
            ] 
          }
        ],
        edges: [
          // Edge array order determines children order
          { src: { node: 'emailInput', port: 'element' }, dst: { node: 'form', port: 'children' } },
          { src: { node: 'submitButton', port: 'element' }, dst: { node: 'form', port: 'children' } }
        ]
      };

      const result = await evaluate(graph, {
        definitions: uiDefinitions,
        outputNode: 'form',
        outputPort: 'element'
      });

      expect(result).toEqual({
        type: 'Form',
        key: 'myForm',
        props: { className: 'flex gap-4' },
        children: [
          {
            type: 'Input',
            key: 'email',
            props: { name: 'email', type: 'email', placeholder: 'Enter email' }
          },
          {
            type: 'Button',
            key: 'submit',
            props: { type: 'submit', text: 'Subscribe' }
          }
        ]
      });
    });

    it('should respect edge array ordering', async () => {
      const graph: Graph = {
        name: 'array-order',
        nodes: [
          { 
            name: 'form', 
            type: 'ui/form/Form', 
            props: [
              { name: 'key', type: 'string', value: 'myForm' },
              { name: 'className', type: 'string', value: '' }
            ] 
          },
          { 
            name: 'first', 
            type: 'ui/form/Button', 
            props: [
              { name: 'key', type: 'string', value: 'first' },
              { name: 'text', type: 'string', value: 'First' }
            ] 
          },
          { 
            name: 'second', 
            type: 'ui/form/Button', 
            props: [
              { name: 'key', type: 'string', value: 'second' },
              { name: 'text', type: 'string', value: 'Second' }
            ] 
          }
        ],
        edges: [
          // Edge array order determines children order: first, then second
          { src: { node: 'first', port: 'element' }, dst: { node: 'form', port: 'children' } },
          { src: { node: 'second', port: 'element' }, dst: { node: 'form', port: 'children' } }
        ]
      };

      const result = await evaluate(graph, {
        definitions: uiDefinitions,
        outputNode: 'form',
        outputPort: 'element'
      });

      // Edge array order determines children order
      expect(result.children[0].key).toBe('first');
      expect(result.children[1].key).toBe('second');
    });

    it('should generate the full newsletter page example', async () => {
      const graph: Graph = {
        name: 'newsletter-page',
        nodes: [
          { 
            name: 'page', 
            type: 'ui/layout/Page', 
            props: [
              { name: 'key', type: 'string', value: 'home' },
              { name: 'className', type: 'string', value: 'min-h-screen' }
            ] 
          },
          { 
            name: 'form', 
            type: 'ui/form/Form', 
            props: [
              { name: 'key', type: 'string', value: 'newsletterForm' },
              { name: 'className', type: 'string', value: 'mt-10 flex gap-x-4' }
            ] 
          },
          { 
            name: 'emailInput', 
            type: 'ui/form/Input', 
            props: [
              { name: 'key', type: 'string', value: 'email' },
              { name: 'name', type: 'string', value: 'email' },
              { name: 'type', type: 'string', value: 'email' },
              { name: 'placeholder', type: 'string', value: 'Enter email' }
            ] 
          },
          { 
            name: 'submitButton', 
            type: 'ui/form/Button', 
            props: [
              { name: 'key', type: 'string', value: 'submit' },
              { name: 'type', type: 'string', value: 'submit' },
              { name: 'text', type: 'string', value: 'Subscribe' }
            ] 
          }
        ],
        edges: [
          // Edge array order determines children order
          { src: { node: 'emailInput', port: 'element' }, dst: { node: 'form', port: 'children' } },
          { src: { node: 'submitButton', port: 'element' }, dst: { node: 'form', port: 'children' } },
          { src: { node: 'form', port: 'element' }, dst: { node: 'page', port: 'children' } }
        ]
      };

      const result = await evaluate(graph, {
        definitions: uiDefinitions,
        outputNode: 'page',
        outputPort: 'element'
      });

      expect(result).toEqual({
        type: 'Page',
        key: 'home',
        props: { className: 'min-h-screen' },
        children: [
          {
            type: 'Form',
            key: 'newsletterForm',
            props: { className: 'mt-10 flex gap-x-4' },
            children: [
              {
                type: 'Input',
                key: 'email',
                props: { name: 'email', type: 'email', placeholder: 'Enter email' }
              },
              {
                type: 'Button',
                key: 'submit',
                props: { type: 'submit', text: 'Subscribe' }
              }
            ]
          }
        ]
      });
    });
  });

  describe('subnet evaluation', () => {
    // Expected vdom output for both flat and subnet graphs
    const expectedVdom = {
      type: 'Page',
      key: 'home',
      props: { className: 'container' },
      children: [
        {
          type: 'Text',
          key: 'header',
          props: { content: 'Welcome' }
        },
        {
          type: 'Form',
          key: 'signupForm',
          props: { className: 'flex gap-4' },
          children: [
            {
              type: 'Input',
              key: 'email',
              props: { name: 'email', type: 'email', placeholder: 'Email' }
            },
            {
              type: 'Button',
              key: 'submit',
              props: { type: 'submit', text: 'Sign Up' }
            }
          ]
        }
      ]
    };

    it('should produce vdom from a flat graph', async () => {
      // Graph A: Flat graph with all nodes at the same level
      const flatGraph: Graph = {
        name: 'flat-page',
        nodes: [
          { 
            name: 'page', 
            type: 'ui/layout/Page', 
            props: [
              { name: 'key', type: 'string', value: 'home' },
              { name: 'className', type: 'string', value: 'container' }
            ] 
          },
          { 
            name: 'header', 
            type: 'ui/content/Text', 
            props: [
              { name: 'key', type: 'string', value: 'header' },
              { name: 'content', type: 'string', value: 'Welcome' }
            ] 
          },
          { 
            name: 'form', 
            type: 'ui/form/Form', 
            props: [
              { name: 'key', type: 'string', value: 'signupForm' },
              { name: 'className', type: 'string', value: 'flex gap-4' }
            ] 
          },
          { 
            name: 'emailInput', 
            type: 'ui/form/Input', 
            props: [
              { name: 'key', type: 'string', value: 'email' },
              { name: 'name', type: 'string', value: 'email' },
              { name: 'type', type: 'string', value: 'email' },
              { name: 'placeholder', type: 'string', value: 'Email' }
            ] 
          },
          { 
            name: 'submitButton', 
            type: 'ui/form/Button', 
            props: [
              { name: 'key', type: 'string', value: 'submit' },
              { name: 'type', type: 'string', value: 'submit' },
              { name: 'text', type: 'string', value: 'Sign Up' }
            ] 
          }
        ],
        edges: [
          // Children order: header first, then form
          { src: { node: 'header', port: 'element' }, dst: { node: 'page', port: 'children' } },
          { src: { node: 'form', port: 'element' }, dst: { node: 'page', port: 'children' } },
          // Form children: emailInput first, then submitButton
          { src: { node: 'emailInput', port: 'element' }, dst: { node: 'form', port: 'children' } },
          { src: { node: 'submitButton', port: 'element' }, dst: { node: 'form', port: 'children' } }
        ]
      };

      const result = await evaluate(flatGraph, {
        definitions: uiDefinitions,
        outputNode: 'page',
        outputPort: 'element'
      });

      expect(result).toEqual(expectedVdom);
    });

    it('should produce identical vdom from a graph with subnet', async () => {
      // Graph B: Page uses a subnet that contains Form + Input + Button
      // The subnet encapsulates the form section
      const graphWithSubnet: Graph = {
        name: 'page-with-subnet',
        nodes: [
          { 
            name: 'page', 
            type: 'ui/layout/Page', 
            props: [
              { name: 'key', type: 'string', value: 'home' },
              { name: 'className', type: 'string', value: 'container' }
            ] 
          },
          { 
            name: 'header', 
            type: 'ui/content/Text', 
            props: [
              { name: 'key', type: 'string', value: 'header' },
              { name: 'content', type: 'string', value: 'Welcome' }
            ] 
          },
          // Subnet node containing the form section
          { 
            name: 'formSection', 
            type: 'subnet',
            kind: 'subnet',
            inputs: [],
            outputs: [{ name: 'element', type: 'Element' }],
            nodes: [
              { 
                name: 'form', 
                type: 'ui/form/Form', 
                props: [
                  { name: 'key', type: 'string', value: 'signupForm' },
                  { name: 'className', type: 'string', value: 'flex gap-4' }
                ] 
              },
              { 
                name: 'emailInput', 
                type: 'ui/form/Input', 
                props: [
                  { name: 'key', type: 'string', value: 'email' },
                  { name: 'name', type: 'string', value: 'email' },
                  { name: 'type', type: 'string', value: 'email' },
                  { name: 'placeholder', type: 'string', value: 'Email' }
                ] 
              },
              { 
                name: 'submitButton', 
                type: 'ui/form/Button', 
                props: [
                  { name: 'key', type: 'string', value: 'submit' },
                  { name: 'type', type: 'string', value: 'submit' },
                  { name: 'text', type: 'string', value: 'Sign Up' }
                ] 
              },
              // Output boundary node - connects form output to subnet output
              { 
                name: 'output_element', 
                type: 'graphOutput',
                props: [{ name: 'portName', type: 'string', value: 'element' }]
              }
            ],
            edges: [
              { src: { node: 'emailInput', port: 'element' }, dst: { node: 'form', port: 'children' } },
              { src: { node: 'submitButton', port: 'element' }, dst: { node: 'form', port: 'children' } },
              { src: { node: 'form', port: 'element' }, dst: { node: 'output_element', port: 'value' } }
            ]
          }
        ],
        edges: [
          // Children order: header first, then formSection subnet
          { src: { node: 'header', port: 'element' }, dst: { node: 'page', port: 'children' } },
          { src: { node: 'formSection', port: 'element' }, dst: { node: 'page', port: 'children' } }
        ]
      };

      const result = await evaluate(graphWithSubnet, {
        definitions: uiDefinitions,
        outputNode: 'page',
        outputPort: 'element'
      });

      // Should produce identical vdom to the flat graph
      expect(result).toEqual(expectedVdom);
    });

    it('should handle subnet with inputs', async () => {
      // Graph with a subnet that takes an input
      const graphWithSubnetInput: Graph = {
        name: 'subnet-with-input',
        nodes: [
          { 
            name: 'page', 
            type: 'ui/layout/Page', 
            props: [
              { name: 'key', type: 'string', value: 'home' },
              { name: 'className', type: 'string', value: '' }
            ] 
          },
          { 
            name: 'welcomeText', 
            type: 'ui/content/Text', 
            props: [
              { name: 'key', type: 'string', value: 'welcome' },
              { name: 'content', type: 'string', value: 'Hello World' }
            ] 
          },
          // Subnet that wraps content in a form
          { 
            name: 'formWrapper', 
            type: 'subnet',
            kind: 'subnet',
            inputs: [{ name: 'content', type: 'Element' }],
            outputs: [{ name: 'element', type: 'Element' }],
            nodes: [
              // Input boundary node (property-based naming)
              { 
                name: 'input_content', 
                type: 'graphInput',
                props: [{ name: 'portName', type: 'string', value: 'content' }]
              },
              { 
                name: 'form', 
                type: 'ui/form/Form', 
                props: [
                  { name: 'key', type: 'string', value: 'wrapper' },
                  { name: 'className', type: 'string', value: 'form-wrapper' }
                ] 
              },
              // Output boundary node (property-based naming)
              { 
                name: 'output_element', 
                type: 'graphOutput',
                props: [{ name: 'portName', type: 'string', value: 'element' }]
              }
            ],
            edges: [
              { src: { node: 'input_content', port: 'value' }, dst: { node: 'form', port: 'children' } },
              { src: { node: 'form', port: 'element' }, dst: { node: 'output_element', port: 'value' } }
            ]
          }
        ],
        edges: [
          // Pass welcomeText into the subnet's content input
          { src: { node: 'welcomeText', port: 'element' }, dst: { node: 'formWrapper', port: 'content' } },
          // Connect subnet output to page children
          { src: { node: 'formWrapper', port: 'element' }, dst: { node: 'page', port: 'children' } }
        ]
      };

      const result = await evaluate(graphWithSubnetInput, {
        definitions: uiDefinitions,
        outputNode: 'page',
        outputPort: 'element'
      });

      expect(result).toEqual({
        type: 'Page',
        key: 'home',
        props: { className: '' },
        children: [
          {
            type: 'Form',
            key: 'wrapper',
            props: { className: 'form-wrapper' },
            children: [
              {
                type: 'Text',
                key: 'welcome',
                props: { content: 'Hello World' }
              }
            ]
          }
        ]
      });
    });
  });

  describe('graphInput default values', () => {
    it('should use default prop value when no external input is provided', async () => {
      const graph: Graph = {
        name: 'input-default-test',
        nodes: [
          { 
            name: 'input_value', 
            type: 'graphInput',
            props: [
              { name: 'portName', type: 'string', value: 'value' },
              { name: 'default', type: 'number', value: 42 }
            ]
          },
          { 
            name: 'output_result', 
            type: 'graphOutput',
            props: [{ name: 'portName', type: 'string', value: 'result' }]
          }
        ],
        edges: [
          { src: { node: 'input_value', port: 'value' }, dst: { node: 'output_result', port: 'value' } }
        ]
      };

      const result = await evaluate(graph, {
        definitions: uiDefinitions,
        outputNode: 'output_result',
        outputPort: 'value'
      });

      expect(result).toBe(42);
    });

    it('should prefer external input over default prop value', async () => {
      const graph: Graph = {
        name: 'input-external-test',
        nodes: [
          { 
            name: 'input_value', 
            type: 'graphInput',
            props: [
              { name: 'portName', type: 'string', value: 'value' },
              { name: 'default', type: 'number', value: 42 }
            ]
          },
          { 
            name: 'output_result', 
            type: 'graphOutput',
            props: [{ name: 'portName', type: 'string', value: 'result' }]
          }
        ],
        edges: [
          { src: { node: 'input_value', port: 'value' }, dst: { node: 'output_result', port: 'value' } }
        ]
      };

      const result = await evaluate(graph, {
        definitions: uiDefinitions,
        outputNode: 'output_result',
        outputPort: 'value',
        inputs: { value: 100 }
      });

      expect(result).toBe(100);
    });
  });
});
