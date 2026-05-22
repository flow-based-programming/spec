import type { NodeDefinitionWithImpl } from '../src/types';

/**
 * Math node definitions with implementations for testing.
 */

export const constNumberDef: NodeDefinitionWithImpl = {
  category: 'const',
  type: 'const/number',
  icon: 'hash',
  outputs: [{ name: 'value', type: 'number' }],
  props: [{ name: 'value', type: 'number', default: 0 }],
  description: 'Outputs a constant number value',
  impl: (_inputs, props) => ({
    value: props.value ?? 0
  })
};

export const addDef: NodeDefinitionWithImpl = {
  category: 'math',
  type: 'math/add',
  icon: 'plus',
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
  category: 'math',
  type: 'math/multiply',
  icon: 'x',
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
