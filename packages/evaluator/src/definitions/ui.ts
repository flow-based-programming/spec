import type { NodeDefinitionWithImpl } from '../types';

/**
 * UI component node definitions with implementations for testing.
 * These produce vdom JSON structures.
 */

// Type coercion helper for boundary nodes
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

// Boundary node definitions for graph inputs/outputs
export const graphInputDef: NodeDefinitionWithImpl = {
  context: 'core',
  name: 'graphInput',
  category: 'graph',
  icon: 'arrow-right',
  inputs: [],
  outputs: [{ name: 'value', type: 'any' }],
  props: [
    { name: 'valueType', type: 'enum', default: 'any', options: ['any', 'number', 'string', 'boolean', 'Element'] },
    { name: 'default', type: 'any' }
  ],
  description: 'Graph input boundary node',
  impl: (_inputs, props) => ({ value: coerceValue(props?.value ?? props?.default, props?.valueType ?? 'any') })
};

export const graphOutputDef: NodeDefinitionWithImpl = {
  context: 'core',
  name: 'graphOutput',
  category: 'graph',
  icon: 'arrow-left',
  inputs: [{ name: 'value', type: 'any' }],
  outputs: [],
  props: [
    { name: 'valueType', type: 'enum', default: 'any', options: ['any', 'number', 'string', 'boolean', 'Element'] }
  ],
  description: 'Graph output boundary node',
  impl: (inputs, props) => ({ value: coerceValue(inputs.value, props?.valueType ?? 'any') })
};

export const graphPropDef: NodeDefinitionWithImpl = {
  context: 'core',
  name: 'graphProp',
  category: 'graph',
  icon: 'settings',
  inputs: [],
  outputs: [{ name: 'value', type: 'any' }],
  props: [
    { name: 'valueType', type: 'enum', default: 'any', options: ['any', 'number', 'string', 'boolean', 'Element'] },
    { name: 'default', type: 'any' }
  ],
  description: 'Graph property boundary node',
  impl: (_inputs, props) => ({ value: coerceValue(props?.value ?? props?.default, props?.valueType ?? 'any') })
};

export const pageDef: NodeDefinitionWithImpl = {
  context: 'js',
  name: 'Page',
  category: 'layout',
  icon: 'file',
  inputs: [
    { name: 'children', type: 'Element[]', multi: true }
  ],
  outputs: [{ name: 'element', type: 'Element' }],
  props: [
    { name: 'className', type: 'string', default: '' },
    { name: 'key', type: 'string', required: true }
  ],
  description: 'A page container component',
  impl: (inputs, props) => ({
    element: {
      type: 'Page',
      key: props.key,
      props: { className: props.className },
      children: inputs.children ?? []
    }
  })
};

export const formDef: NodeDefinitionWithImpl = {
  context: 'js',
  name: 'Form',
  category: 'form',
  icon: 'file-text',
  inputs: [
    { name: 'children', type: 'Element[]', multi: true }
  ],
  outputs: [{ name: 'element', type: 'Element' }],
  props: [
    { name: 'className', type: 'string', default: '' },
    { name: 'key', type: 'string', required: true }
  ],
  description: 'A form container component',
  impl: (inputs, props) => ({
    element: {
      type: 'Form',
      key: props.key,
      props: { className: props.className },
      children: inputs.children ?? []
    }
  })
};

export const inputDef: NodeDefinitionWithImpl = {
  context: 'js',
  name: 'Input',
  category: 'form',
  icon: 'text-cursor',
  inputs: [],
  outputs: [{ name: 'element', type: 'Element' }],
  props: [
    { name: 'key', type: 'string', required: true },
    { name: 'name', type: 'string', required: true },
    { name: 'type', type: 'string', default: 'text' },
    { name: 'placeholder', type: 'string', default: '' }
  ],
  description: 'An input field component',
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
  })
};

export const buttonDef: NodeDefinitionWithImpl = {
  context: 'js',
  name: 'Button',
  category: 'form',
  icon: 'square',
  inputs: [],
  outputs: [{ name: 'element', type: 'Element' }],
  props: [
    { name: 'key', type: 'string', required: true },
    { name: 'type', type: 'string', default: 'button' },
    { name: 'text', type: 'string', required: true }
  ],
  description: 'A button component',
  impl: (_inputs, props) => ({
    element: {
      type: 'Button',
      key: props.key,
      props: {
        type: props.type ?? 'button',
        text: props.text
      }
    }
  })
};

export const textDef: NodeDefinitionWithImpl = {
  context: 'js',
  name: 'Text',
  category: 'content',
  icon: 'type',
  inputs: [],
  outputs: [{ name: 'element', type: 'Element' }],
  props: [
    { name: 'key', type: 'string', required: true },
    { name: 'content', type: 'string', required: true }
  ],
  description: 'A text content component',
  impl: (_inputs, props) => ({
    element: {
      type: 'Text',
      key: props.key,
      props: {
        content: props.content
      }
    }
  })
};

export const uiDefinitions: NodeDefinitionWithImpl[] = [
  pageDef,
  formDef,
  inputDef,
  buttonDef,
  textDef,
  graphInputDef,
  graphOutputDef,
  graphPropDef
];
