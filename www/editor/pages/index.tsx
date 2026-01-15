import React, { useState, useMemo } from 'react';
import { GraphEditor } from '@fbp/graph-editor';
import { evaluate } from '@fbp/evaluator';
import type { NodeDefinitionWithImpl } from '@fbp/evaluator';
import type { Graph } from '@fbp/types';

function coerceValue(value: any, valueType: string): any {
  if (value === undefined || value === null) return value;
  switch (valueType) {
    case 'number':
      return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
    case 'string':
      return String(value);
    case 'boolean':
      return value === true || value === 'true' || value === 1;
    case 'Element':
    case 'any':
    default:
      return value;
  }
}

const graphInputDef: NodeDefinitionWithImpl = {
  context: 'core',
  category: 'graph',
  type: 'core/graph/input',
  inputs: [],
  outputs: [{ name: 'value', type: 'any' }],
  props: [
    { name: 'valueType', type: 'enum', default: 'any', options: ['any', 'number', 'string', 'boolean', 'Element'], description: 'Type of the input value' },
    { name: 'default', type: 'any', description: 'Default value when not provided externally' }
  ],
  description: 'Graph input boundary node',
  impl: (_inputs, props) => ({ value: coerceValue(props?.value ?? props?.default, props?.valueType ?? 'any') }),
};

const graphOutputDef: NodeDefinitionWithImpl = {
  context: 'core',
  category: 'graph',
  type: 'core/graph/output',
  inputs: [{ name: 'value', type: 'any' }],
  outputs: [{ name: 'value', type: 'any' }],
  props: [
    { name: 'valueType', type: 'enum', default: 'any', options: ['any', 'number', 'string', 'boolean', 'Element'], description: 'Type of the output value' }
  ],
  description: 'Graph output boundary node',
  impl: (inputs, props) => ({ value: coerceValue(inputs.value, props?.valueType ?? 'any') }),
};

const graphPropDef: NodeDefinitionWithImpl = {
  context: 'core',
  category: 'graph',
  type: 'core/graph/prop',
  inputs: [],
  outputs: [{ name: 'value', type: 'any' }],
  props: [
    { name: 'valueType', type: 'enum', default: 'any', options: ['any', 'number', 'string', 'boolean', 'Element'], description: 'Type of the property value' },
    { name: 'default', type: 'any', description: 'Default value for the prop' }
  ],
  description: 'Graph property boundary node',
  impl: (_inputs, props) => ({ value: coerceValue(props?.value ?? props?.default, props?.valueType ?? 'any') }),
};

const mathDefinitions: NodeDefinitionWithImpl[] = [
  {
    context: 'js',
    category: 'const',
    type: 'js/const/number',
    outputs: [{ name: 'value', type: 'number' }],
    props: [
      { name: 'value', type: 'number', default: 0, description: 'The constant value' }
    ],
    impl: (_inputs, props) => ({ value: props.value ?? 0 }),
  },
  {
    context: 'js',
    category: 'math',
    type: 'js/math/add',
    inputs: [
      { name: 'a', type: 'number' },
      { name: 'b', type: 'number' },
    ],
    outputs: [{ name: 'sum', type: 'number' }],
    impl: (inputs) => ({ sum: (inputs.a ?? 0) + (inputs.b ?? 0) }),
  },
  {
    context: 'js',
    category: 'math',
    type: 'js/math/multiply',
    inputs: [
      { name: 'a', type: 'number' },
      { name: 'b', type: 'number' },
    ],
    outputs: [{ name: 'product', type: 'number' }],
    impl: (inputs) => ({ product: (inputs.a ?? 0) * (inputs.b ?? 0) }),
  },
  graphInputDef,
  graphOutputDef,
  graphPropDef,
];

const uiDefinitions: NodeDefinitionWithImpl[] = [
  {
    context: 'ui',
    category: 'layout',
    type: 'ui/layout/Page',
    inputs: [{ name: 'children', type: 'Element[]', multi: true }],
    outputs: [{ name: 'element', type: 'Element' }],
    props: [
      { name: 'className', type: 'string', default: '' },
      { name: 'key', type: 'string', required: true }
    ],
    impl: (inputs, props) => ({
      element: {
        type: 'Page',
        key: props.key,
        props: { className: props.className },
        children: inputs.children ?? []
      }
    }),
  },
  {
    context: 'ui',
    category: 'form',
    type: 'ui/form/Form',
    inputs: [{ name: 'children', type: 'Element[]', multi: true }],
    outputs: [{ name: 'element', type: 'Element' }],
    props: [
      { name: 'className', type: 'string', default: '' },
      { name: 'key', type: 'string', required: true }
    ],
    impl: (inputs, props) => ({
      element: {
        type: 'Form',
        key: props.key,
        props: { className: props.className },
        children: inputs.children ?? []
      }
    }),
  },
  {
    context: 'ui',
    category: 'form',
    type: 'ui/form/Input',
    inputs: [],
    outputs: [{ name: 'element', type: 'Element' }],
    props: [
      { name: 'key', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'type', type: 'string', default: 'text' },
      { name: 'placeholder', type: 'string', default: '' }
    ],
    impl: (_inputs, props) => ({
      element: {
        type: 'Input',
        key: props.key,
        props: {
          name: props.name,
          type: props.type ?? 'text',
          placeholder: props.placeholder ?? ''
        }
      }
    }),
  },
  {
    context: 'ui',
    category: 'form',
    type: 'ui/form/Button',
    inputs: [],
    outputs: [{ name: 'element', type: 'Element' }],
    props: [
      { name: 'key', type: 'string', required: true },
      { name: 'type', type: 'string', default: 'button' },
      { name: 'text', type: 'string', required: true }
    ],
    impl: (_inputs, props) => ({
      element: {
        type: 'Button',
        key: props.key,
        props: {
          type: props.type ?? 'button',
          text: props.text
        }
      }
    }),
  },
  graphInputDef,
  graphOutputDef,
  graphPropDef,
];

const examples: Record<string, Graph> = {
  'Simple Add (5 + 3 = 8)': {
    name: 'simple-add',
    definitions: mathDefinitions,
    nodes: [
      { name: 'num1', type: 'js/const/number', props: [{ name: 'value', type: 'number', value: 5 }], meta: { x: 100, y: 100 } },
      { name: 'num2', type: 'js/const/number', props: [{ name: 'value', type: 'number', value: 3 }], meta: { x: 100, y: 250 } },
      { name: 'add', type: 'js/math/add', meta: { x: 350, y: 150 } },
      { name: '@out/result', type: 'core/graph/output', kind: 'graphOutput', meta: { x: 550, y: 150 } }
    ],
    edges: [
      { src: { node: 'num1', port: 'value' }, dst: { node: 'add', port: 'a' } },
      { src: { node: 'num2', port: 'value' }, dst: { node: 'add', port: 'b' } },
      { src: { node: 'add', port: 'sum' }, dst: { node: '@out/result', port: 'value' } }
    ]
  },
  'Chained Math ((2 + 3) * 4 = 20)': {
    name: 'chained-math',
    definitions: mathDefinitions,
    nodes: [
      { name: 'num1', type: 'js/const/number', props: [{ name: 'value', type: 'number', value: 2 }], meta: { x: 100, y: 100 } },
      { name: 'num2', type: 'js/const/number', props: [{ name: 'value', type: 'number', value: 3 }], meta: { x: 100, y: 250 } },
      { name: 'num3', type: 'js/const/number', props: [{ name: 'value', type: 'number', value: 4 }], meta: { x: 100, y: 400 } },
      { name: 'add', type: 'js/math/add', meta: { x: 350, y: 150 } },
      { name: 'multiply', type: 'js/math/multiply', meta: { x: 600, y: 200 } },
      { name: '@out/result', type: 'core/graph/output', kind: 'graphOutput', meta: { x: 850, y: 200 } }
    ],
    edges: [
      { src: { node: 'num1', port: 'value' }, dst: { node: 'add', port: 'a' } },
      { src: { node: 'num2', port: 'value' }, dst: { node: 'add', port: 'b' } },
      { src: { node: 'add', port: 'sum' }, dst: { node: 'multiply', port: 'a' } },
      { src: { node: 'num3', port: 'value' }, dst: { node: 'multiply', port: 'b' } },
      { src: { node: 'multiply', port: 'product' }, dst: { node: '@out/result', port: 'value' } }
    ]
  },
  'Simple Page': {
    name: 'simple-page',
    definitions: uiDefinitions,
    nodes: [
      { 
        name: 'page', 
        type: 'ui/layout/Page', 
        props: [
          { name: 'key', type: 'string', value: 'home' },
          { name: 'className', type: 'string', value: 'min-h-screen' }
        ],
        meta: { x: 300, y: 150 }
      },
      { name: '@out/result', type: 'core/graph/output', kind: 'graphOutput', meta: { x: 550, y: 150 } }
    ],
    edges: [
      { src: { node: 'page', port: 'element' }, dst: { node: '@out/result', port: 'value' } }
    ]
  },
  'Form with Children': {
    name: 'form-with-children',
    definitions: uiDefinitions,
    nodes: [
      { 
        name: 'form', 
        type: 'ui/form/Form', 
        props: [
          { name: 'key', type: 'string', value: 'myForm' },
          { name: 'className', type: 'string', value: 'flex gap-4' }
        ],
        meta: { x: 500, y: 200 }
      },
      { 
        name: 'emailInput', 
        type: 'ui/form/Input', 
        props: [
          { name: 'key', type: 'string', value: 'email' },
          { name: 'name', type: 'string', value: 'email' },
          { name: 'type', type: 'string', value: 'email' },
          { name: 'placeholder', type: 'string', value: 'Enter email' }
        ],
        meta: { x: 100, y: 100 }
      },
      { 
        name: 'submitButton', 
        type: 'ui/form/Button', 
        props: [
          { name: 'key', type: 'string', value: 'submit' },
          { name: 'type', type: 'string', value: 'submit' },
          { name: 'text', type: 'string', value: 'Subscribe' }
        ],
        meta: { x: 100, y: 300 }
      },
      { name: '@out/result', type: 'core/graph/output', kind: 'graphOutput', meta: { x: 750, y: 200 } }
    ],
    edges: [
      { src: { node: 'emailInput', port: 'element' }, dst: { node: 'form', port: 'children' } },
      { src: { node: 'submitButton', port: 'element' }, dst: { node: 'form', port: 'children' } },
      { src: { node: 'form', port: 'element' }, dst: { node: '@out/result', port: 'value' } }
    ]
  },
  'Newsletter Page': {
    name: 'newsletter-page',
    definitions: uiDefinitions,
    nodes: [
      { 
        name: 'page', 
        type: 'ui/layout/Page', 
        props: [
          { name: 'key', type: 'string', value: 'home' },
          { name: 'className', type: 'string', value: 'min-h-screen' }
        ],
        meta: { x: 700, y: 200 }
      },
      { 
        name: 'form', 
        type: 'ui/form/Form', 
        props: [
          { name: 'key', type: 'string', value: 'newsletterForm' },
          { name: 'className', type: 'string', value: 'mt-10 flex gap-x-4' }
        ],
        meta: { x: 400, y: 200 }
      },
      { 
        name: 'emailInput', 
        type: 'ui/form/Input', 
        props: [
          { name: 'key', type: 'string', value: 'email' },
          { name: 'name', type: 'string', value: 'email' },
          { name: 'type', type: 'string', value: 'email' },
          { name: 'placeholder', type: 'string', value: 'Enter email' }
        ],
        meta: { x: 100, y: 100 }
      },
      { 
        name: 'submitButton', 
        type: 'ui/form/Button', 
        props: [
          { name: 'key', type: 'string', value: 'submit' },
          { name: 'type', type: 'string', value: 'submit' },
          { name: 'text', type: 'string', value: 'Subscribe' }
        ],
        meta: { x: 100, y: 300 }
      },
      { name: '@out/result', type: 'core/graph/output', kind: 'graphOutput', meta: { x: 950, y: 200 } }
    ],
    edges: [
      { src: { node: 'emailInput', port: 'element' }, dst: { node: 'form', port: 'children' } },
      { src: { node: 'submitButton', port: 'element' }, dst: { node: 'form', port: 'children' } },
      { src: { node: 'form', port: 'element' }, dst: { node: 'page', port: 'children' } },
      { src: { node: 'page', port: 'element' }, dst: { node: '@out/result', port: 'value' } }
    ]
  }
};

const exampleNames = Object.keys(examples);

export default function Home() {
  const [selectedExample, setSelectedExample] = useState(exampleNames[0]);
  const graph = examples[selectedExample];

  return (
    <div className="h-screen w-screen flex flex-col">
      <div className="h-12 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-4">
        <label className="text-sm text-slate-300">Example:</label>
        <select
          value={selectedExample}
          onChange={(e) => setSelectedExample(e.target.value)}
          className="bg-slate-700 text-slate-200 text-sm rounded px-3 py-1.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {exampleNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500 ml-2">
          Switch between examples to see different flow graphs
        </span>
      </div>
      <div className="flex-1">
        <GraphEditor 
          key={selectedExample} 
          graph={graph}
          definitions={graph.definitions as NodeDefinitionWithImpl[]}
          evaluateFn={evaluate}
        />
      </div>
    </div>
  );
}
