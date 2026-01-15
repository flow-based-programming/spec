import type { NodeDefinitionWithImpl } from '../types';

/**
 * Math node definitions with implementations for testing.
 */

export const constNumberDef: NodeDefinitionWithImpl = {
  context: 'js',
  category: 'const',
  type: 'js/const/number',
  icon: '#',
  outputs: [{ name: 'value', type: 'number' }],
  props: [{ name: 'value', type: 'number', default: 0 }],
  description: 'Outputs a constant number value',
  impl: (_inputs, props) => ({
    value: props.value ?? 0
  })
};

export const addDef: NodeDefinitionWithImpl = {
  context: 'js',
  category: 'math',
  type: 'js/math/add',
  icon: '+',
  inputs: [
    { name: 'a', type: 'number' },
    { name: 'b', type: 'number' }
  ],
  outputs: [{ name: 'sum', type: 'number' }],
  description: 'Adds two numbers',
  impl: (inputs) => ({
    sum: (inputs.a ?? 0) + (inputs.b ?? 0)
  })
};

export const multiplyDef: NodeDefinitionWithImpl = {
  context: 'js',
  category: 'math',
  type: 'js/math/multiply',
  icon: '×',
  inputs: [
    { name: 'a', type: 'number' },
    { name: 'b', type: 'number' }
  ],
  outputs: [{ name: 'product', type: 'number' }],
  description: 'Multiplies two numbers',
  impl: (inputs) => ({
    product: (inputs.a ?? 0) * (inputs.b ?? 0)
  })
};

export const mathDefinitions: NodeDefinitionWithImpl[] = [
  constNumberDef,
  addDef,
  multiplyDef
];
