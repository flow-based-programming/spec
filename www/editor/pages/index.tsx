import React, { useState, useMemo } from 'react';
import { GraphEditor } from '@fbp/graph-editor';
import { 
  evaluate,
  mathDefinitions as evalMathDefs,
  uiDefinitions as evalUiDefs,
  coreDefinitions as evalCoreDefs,
  netDefinitions as evalNetDefs,
} from '@fbp/evaluator';
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
  name: 'graphInput',
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
  name: 'graphOutput',
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
  name: 'graphProp',
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
    name: 'number',
    outputs: [{ name: 'value', type: 'number' }],
    props: [
      { name: 'value', type: 'number', default: 0, description: 'The constant value' }
    ],
    impl: (_inputs, props) => ({ value: props.value ?? 0 }),
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
    impl: (inputs) => ({ sum: (inputs.a ?? 0) + (inputs.b ?? 0) }),
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
    impl: (inputs) => ({ product: (inputs.a ?? 0) * (inputs.b ?? 0) }),
  },
  graphInputDef,
  graphOutputDef,
  graphPropDef,
];

// Combined definitions that include all node types from the evaluator
const allDefinitions: NodeDefinitionWithImpl[] = [
  ...evalMathDefs,
  ...evalUiDefs,
  ...evalCoreDefs,
  ...evalNetDefs,
];

const uiDefinitions: NodeDefinitionWithImpl[] = [
  {
    context: 'ui',
    category: 'layout',
    name: 'Page',
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
    name: 'Form',
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
    name: 'Input',
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
    name: 'Button',
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
    definitions: allDefinitions,
    nodes: [
      { name: 'num1', type: 'number', props: [{ name: 'value', type: 'number', value: 5 }], meta: { x: 100, y: 100 } },
      { name: 'num2', type: 'number', props: [{ name: 'value', type: 'number', value: 3 }], meta: { x: 100, y: 250 } },
      { name: 'add', type: 'add', meta: { x: 350, y: 150 } },
      { name: 'output_result', type: 'graphOutput', props: [{ name: 'portName', type: 'string', value: 'result' }], meta: { x: 550, y: 150 } }
    ],
    edges: [
      { src: { node: 'num1', port: 'value' }, dst: { node: 'add', port: 'a' } },
      { src: { node: 'num2', port: 'value' }, dst: { node: 'add', port: 'b' } },
      { src: { node: 'add', port: 'sum' }, dst: { node: 'output_result', port: 'value' } }
    ]
  },
  'Chained Math ((2 + 3) * 4 = 20)': {
    name: 'chained-math',
    definitions: allDefinitions,
    nodes: [
      { name: 'num1', type: 'number', props: [{ name: 'value', type: 'number', value: 2 }], meta: { x: 100, y: 100 } },
      { name: 'num2', type: 'number', props: [{ name: 'value', type: 'number', value: 3 }], meta: { x: 100, y: 250 } },
      { name: 'num3', type: 'number', props: [{ name: 'value', type: 'number', value: 4 }], meta: { x: 100, y: 400 } },
      { name: 'add', type: 'add', meta: { x: 350, y: 150 } },
      { name: 'multiply', type: 'multiply', meta: { x: 600, y: 200 } },
      { name: 'output_result', type: 'graphOutput', props: [{ name: 'portName', type: 'string', value: 'result' }], meta: { x: 850, y: 200 } }
    ],
    edges: [
      { src: { node: 'num1', port: 'value' }, dst: { node: 'add', port: 'a' } },
      { src: { node: 'num2', port: 'value' }, dst: { node: 'add', port: 'b' } },
      { src: { node: 'add', port: 'sum' }, dst: { node: 'multiply', port: 'a' } },
      { src: { node: 'num3', port: 'value' }, dst: { node: 'multiply', port: 'b' } },
      { src: { node: 'multiply', port: 'product' }, dst: { node: 'output_result', port: 'value' } }
    ]
  },
  'Simple Page': {
    name: 'simple-page',
    definitions: allDefinitions,
    nodes: [
      { 
        name: 'page', 
        type: 'Page', 
        props: [
          { name: 'key', type: 'string', value: 'home' },
          { name: 'className', type: 'string', value: 'min-h-screen' }
        ],
        meta: { x: 300, y: 150 }
      },
      { name: 'output_result', type: 'graphOutput', props: [{ name: 'portName', type: 'string', value: 'result' }], meta: { x: 550, y: 150 } }
    ],
    edges: [
      { src: { node: 'page', port: 'element' }, dst: { node: 'output_result', port: 'value' } }
    ]
  },
  'Form with Children': {
    name: 'form-with-children',
    definitions: allDefinitions,
    nodes: [
      { 
        name: 'form', 
        type: 'Form', 
        props: [
          { name: 'key', type: 'string', value: 'myForm' },
          { name: 'className', type: 'string', value: 'flex gap-4' }
        ],
        meta: { x: 500, y: 200 }
      },
      { 
        name: 'emailInput', 
        type: 'Input', 
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
        type: 'Button', 
        props: [
          { name: 'key', type: 'string', value: 'submit' },
          { name: 'type', type: 'string', value: 'submit' },
          { name: 'text', type: 'string', value: 'Subscribe' }
        ],
        meta: { x: 100, y: 300 }
      },
      { name: 'output_result', type: 'graphOutput', props: [{ name: 'portName', type: 'string', value: 'result' }], meta: { x: 750, y: 200 } }
    ],
    edges: [
      { src: { node: 'emailInput', port: 'element' }, dst: { node: 'form', port: 'children' } },
      { src: { node: 'submitButton', port: 'element' }, dst: { node: 'form', port: 'children' } },
      { src: { node: 'form', port: 'element' }, dst: { node: 'output_result', port: 'value' } }
    ]
  },
  'Newsletter Page': {
    name: 'newsletter-page',
    definitions: allDefinitions,
    nodes: [
      { 
        name: 'page', 
        type: 'Page', 
        props: [
          { name: 'key', type: 'string', value: 'home' },
          { name: 'className', type: 'string', value: 'min-h-screen' }
        ],
        meta: { x: 700, y: 200 }
      },
      { 
        name: 'form', 
        type: 'Form', 
        props: [
          { name: 'key', type: 'string', value: 'newsletterForm' },
          { name: 'className', type: 'string', value: 'mt-10 flex gap-x-4' }
        ],
        meta: { x: 400, y: 200 }
      },
      { 
        name: 'emailInput', 
        type: 'Input', 
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
        type: 'Button', 
        props: [
          { name: 'key', type: 'string', value: 'submit' },
          { name: 'type', type: 'string', value: 'submit' },
          { name: 'text', type: 'string', value: 'Subscribe' }
        ],
        meta: { x: 100, y: 300 }
      },
      { name: 'output_result', type: 'graphOutput', props: [{ name: 'portName', type: 'string', value: 'result' }], meta: { x: 950, y: 200 } }
    ],
    edges: [
      { src: { node: 'emailInput', port: 'element' }, dst: { node: 'form', port: 'children' } },
      { src: { node: 'submitButton', port: 'element' }, dst: { node: 'form', port: 'children' } },
      { src: { node: 'form', port: 'element' }, dst: { node: 'page', port: 'children' } },
      { src: { node: 'page', port: 'element' }, dst: { node: 'output_result', port: 'value' } }
    ]
  },
  'Subgraph Example (Math in Subnet)': {
    name: 'subgraph-math',
    definitions: allDefinitions,
    nodes: [
      { name: 'input1', type: 'number', props: [{ name: 'value', type: 'number', value: 10 }], meta: { x: 100, y: 150 } },
      { name: 'input2', type: 'number', props: [{ name: 'value', type: 'number', value: 5 }], meta: { x: 100, y: 350 } },
      { 
        name: 'mathSubnet', 
        type: 'subnet',
        inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }],
        outputs: [{ name: 'result', type: 'number' }],
        meta: { x: 350, y: 200 },
        nodes: [
          { name: 'input_a', type: 'graphInput', props: [{ name: 'portName', type: 'string', value: 'a' }], meta: { x: 50, y: 100 } },
          { name: 'input_b', type: 'graphInput', props: [{ name: 'portName', type: 'string', value: 'b' }], meta: { x: 50, y: 250 } },
          { name: 'add', type: 'add', meta: { x: 250, y: 150 } },
          { name: 'double', type: 'multiply', meta: { x: 450, y: 150 } },
          { name: 'two', type: 'number', props: [{ name: 'value', type: 'number', value: 2 }], meta: { x: 250, y: 300 } },
          { name: 'output_result', type: 'graphOutput', props: [{ name: 'portName', type: 'string', value: 'result' }], meta: { x: 650, y: 150 } }
        ],
        edges: [
          { src: { node: 'input_a', port: 'value' }, dst: { node: 'add', port: 'a' } },
          { src: { node: 'input_b', port: 'value' }, dst: { node: 'add', port: 'b' } },
          { src: { node: 'add', port: 'sum' }, dst: { node: 'double', port: 'a' } },
          { src: { node: 'two', port: 'value' }, dst: { node: 'double', port: 'b' } },
          { src: { node: 'double', port: 'product' }, dst: { node: 'output_result', port: 'value' } }
        ]
      },
      { name: 'output_result', type: 'graphOutput', props: [{ name: 'portName', type: 'string', value: 'result' }], meta: { x: 600, y: 200 } }
    ],
    edges: [
      { src: { node: 'input1', port: 'value' }, dst: { node: 'mathSubnet', port: 'a' } },
      { src: { node: 'input2', port: 'value' }, dst: { node: 'mathSubnet', port: 'b' } },
      { src: { node: 'mathSubnet', port: 'result' }, dst: { node: 'output_result', port: 'value' } }
    ]
  },
  'GraphQL Login (Extract Token)': {
    name: 'graphql-login',
    definitions: allDefinitions,
    nodes: [
      // Input nodes for credentials (property-based naming)
      { 
        name: 'input_email', 
        type: 'graphInput',
        props: [
          { name: 'portName', type: 'string', value: 'email' },
          { name: 'valueType', type: 'string', value: 'string' },
          { name: 'default', type: 'string', value: 'user@example.com' }
        ],
        meta: { x: 50, y: 50 } 
      },
      { 
        name: 'input_password', 
        type: 'graphInput',
        props: [
          { name: 'portName', type: 'string', value: 'password' },
          { name: 'valueType', type: 'string', value: 'string' },
          { name: 'default', type: 'string', value: 'password123' }
        ],
        meta: { x: 50, y: 150 } 
      },
      { 
        name: 'input_rememberMe', 
        type: 'graphInput',
        props: [
          { name: 'portName', type: 'string', value: 'rememberMe' },
          { name: 'valueType', type: 'string', value: 'boolean' },
          { name: 'default', type: 'boolean', value: true }
        ],
        meta: { x: 50, y: 250 } 
      },
      // Build variables object
      {
        name: 'buildVariables',
        type: 'object',
        meta: { x: 300, y: 100 }
      },
      // GraphQL request node
      {
        name: 'loginRequest',
        type: 'request',
        props: [
          { name: 'endpoint', type: 'string', value: 'https://api.example.com/graphql' },
          { 
            name: 'document', 
            type: 'string', 
            value: `mutation Login($input: LoginInput!) {
  login(input: $input) {
    apiToken {
      accessToken
      accessTokenExpiresAt
      id
      userId
    }
  }
}`
          }
        ],
        meta: { x: 550, y: 100 }
      },
      // Extract properties from response
      {
        name: 'selectAccessToken',
        type: 'select',
        props: [{ name: 'path', type: 'string', value: 'login.apiToken.accessToken' }],
        meta: { x: 800, y: 50 }
      },
      {
        name: 'selectExpiresAt',
        type: 'select',
        props: [{ name: 'path', type: 'string', value: 'login.apiToken.accessTokenExpiresAt' }],
        meta: { x: 800, y: 150 }
      },
      {
        name: 'selectUserId',
        type: 'select',
        props: [{ name: 'path', type: 'string', value: 'login.apiToken.userId' }],
        meta: { x: 800, y: 250 }
      },
      {
        name: 'selectTokenId',
        type: 'select',
        props: [{ name: 'path', type: 'string', value: 'login.apiToken.id' }],
        meta: { x: 800, y: 350 }
      },
      // Output nodes (property-based naming)
      { name: 'output_accessToken', type: 'graphOutput', props: [{ name: 'portName', type: 'string', value: 'accessToken' }], meta: { x: 1050, y: 50 } },
      { name: 'output_expiresAt', type: 'graphOutput', props: [{ name: 'portName', type: 'string', value: 'expiresAt' }], meta: { x: 1050, y: 150 } },
      { name: 'output_userId', type: 'graphOutput', props: [{ name: 'portName', type: 'string', value: 'userId' }], meta: { x: 1050, y: 250 } },
      { name: 'output_tokenId', type: 'graphOutput', props: [{ name: 'portName', type: 'string', value: 'tokenId' }], meta: { x: 1050, y: 350 } }
    ],
    edges: [
      // Connect inputs to variables builder
      { src: { node: 'input_email', port: 'value' }, dst: { node: 'buildVariables', port: 'email' } },
      { src: { node: 'input_password', port: 'value' }, dst: { node: 'buildVariables', port: 'password' } },
      { src: { node: 'input_rememberMe', port: 'value' }, dst: { node: 'buildVariables', port: 'rememberMe' } },
      // Connect variables to GraphQL request
      { src: { node: 'buildVariables', port: 'value' }, dst: { node: 'loginRequest', port: 'variables' } },
      // Connect response data to selectors
      { src: { node: 'loginRequest', port: 'data' }, dst: { node: 'selectAccessToken', port: 'obj' } },
      { src: { node: 'loginRequest', port: 'data' }, dst: { node: 'selectExpiresAt', port: 'obj' } },
      { src: { node: 'loginRequest', port: 'data' }, dst: { node: 'selectUserId', port: 'obj' } },
      { src: { node: 'loginRequest', port: 'data' }, dst: { node: 'selectTokenId', port: 'obj' } },
      // Connect selectors to outputs
      { src: { node: 'selectAccessToken', port: 'value' }, dst: { node: 'output_accessToken', port: 'value' } },
      { src: { node: 'selectExpiresAt', port: 'value' }, dst: { node: 'output_expiresAt', port: 'value' } },
      { src: { node: 'selectUserId', port: 'value' }, dst: { node: 'output_userId', port: 'value' } },
      { src: { node: 'selectTokenId', port: 'value' }, dst: { node: 'output_tokenId', port: 'value' } }
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
