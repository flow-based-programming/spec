import type { NodeDefinitionWithImpl } from '../src/types';

/**
 * Core node definitions with implementations.
 * These nodes handle JSON manipulation, flow control, and string operations.
 */

/**
 * core/json/select - Extract a value from JSON by path
 * 
 * Props:
 * - path: string (dot-path like "a.b.c" or "data.user.email")
 * 
 * Inputs:
 * - obj: json (the object to extract from)
 * 
 * Outputs:
 * - value: any (the extracted value)
 */
export const jsonSelectDef: NodeDefinitionWithImpl = {
  context: 'js',
  name: 'select',
  category: 'json',
  icon: 'circle',
  inputs: [
    { name: 'obj', type: 'json' }
  ],
  outputs: [
    { name: 'value', type: 'any' }
  ],
  props: [
    { name: 'path', type: 'string', default: '' }
  ],
  description: 'Extract a value from JSON by dot-path',
  impl: (inputs, props) => {
    const { obj } = inputs;
    const { path } = props;

    if (!path || obj === undefined || obj === null) {
      return { value: undefined };
    }

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return { value: undefined };
      }
      // Handle array index access like "items.0.name"
      const index = parseInt(part, 10);
      if (!isNaN(index) && Array.isArray(current)) {
        current = current[index];
      } else if (typeof current === 'object') {
        current = current[part];
      } else {
        return { value: undefined };
      }
    }

    return { value: current };
  }
};

/**
 * core/json/object - Build a JSON object from named inputs
 * 
 * This node has dynamic inputs - any input wired to it becomes a key in the output object.
 * The implementation receives all inputs as a Record<string, any>.
 * 
 * Inputs:
 * - (dynamic) arbitrary named inputs
 * 
 * Outputs:
 * - value: json (the constructed object)
 */
export const jsonObjectDef: NodeDefinitionWithImpl = {
  context: 'js',
  name: 'object',
  category: 'json',
  icon: 'braces',
  inputs: [], // Dynamic inputs - any input name is valid
  outputs: [
    { name: 'value', type: 'json' }
  ],
  props: [],
  description: 'Build a JSON object from named inputs',
  impl: (inputs) => {
    // All inputs become keys in the output object
    return { value: { ...inputs } };
  }
};

/**
 * core/flow/guard - Stop the flow if a condition fails
 * 
 * Inputs:
 * - ok: boolean (the condition to check)
 * - error?: json (optional error info)
 * 
 * Outputs:
 * - pass: signal (emitted if ok is true)
 * - fail: signal (emitted if ok is false)
 * - error: json (the error if failed)
 */
export const flowGuardDef: NodeDefinitionWithImpl = {
  context: 'js',
  name: 'guard',
  category: 'flow',
  icon: 'zap',
  inputs: [
    { name: 'ok', type: 'boolean' },
    { name: 'error', type: 'json' }
  ],
  outputs: [
    { name: 'pass', type: 'signal' },
    { name: 'fail', type: 'signal' },
    { name: 'error', type: 'json' }
  ],
  props: [],
  description: 'Stop the flow if a condition fails',
  impl: (inputs) => {
    const { ok, error } = inputs;
    
    if (ok) {
      return {
        pass: true,
        fail: false,
        error: null
      };
    } else {
      return {
        pass: false,
        fail: true,
        error: error || { message: 'Guard condition failed' }
      };
    }
  }
};

/**
 * core/string/template - Build a string from a template with placeholders
 * 
 * Props:
 * - template: string (template with {{placeholder}} syntax)
 * 
 * Inputs:
 * - (dynamic) values to substitute into the template
 * 
 * Outputs:
 * - value: string (the resulting string)
 */
export const stringTemplateDef: NodeDefinitionWithImpl = {
  context: 'js',
  name: 'template',
  category: 'string',
  icon: 'quote',
  inputs: [], // Dynamic inputs based on template placeholders
  outputs: [
    { name: 'value', type: 'string' }
  ],
  props: [
    { name: 'template', type: 'string', default: '' }
  ],
  description: 'Build a string from a template with {{placeholder}} syntax',
  impl: (inputs, props) => {
    const { template } = props;
    
    if (!template) {
      return { value: '' };
    }

    // Replace {{placeholder}} with input values
    const result = template.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => {
      const value = inputs[key];
      if (value === undefined || value === null) {
        return match; // Keep placeholder if no value
      }
      return String(value);
    });

    return { value: result };
  }
};

/**
 * core/string/concat - Concatenate strings with an optional separator
 * 
 * Props:
 * - prefix: string (optional prefix)
 * - suffix: string (optional suffix)
 * 
 * Inputs:
 * - value: string (the main value)
 * 
 * Outputs:
 * - value: string (the resulting string)
 */
export const stringConcatDef: NodeDefinitionWithImpl = {
  context: 'js',
  name: 'concat',
  category: 'string',
  icon: 'link',
  inputs: [
    { name: 'value', type: 'string' }
  ],
  outputs: [
    { name: 'value', type: 'string' }
  ],
  props: [
    { name: 'prefix', type: 'string', default: '' },
    { name: 'suffix', type: 'string', default: '' }
  ],
  description: 'Concatenate strings with optional prefix/suffix',
  impl: (inputs, props) => {
    const { value = '' } = inputs;
    const { prefix = '', suffix = '' } = props;
    
    return { value: `${prefix}${value}${suffix}` };
  }
};

export const coreDefinitions: NodeDefinitionWithImpl[] = [
  jsonSelectDef,
  jsonObjectDef,
  flowGuardDef,
  stringTemplateDef,
  stringConcatDef
];
