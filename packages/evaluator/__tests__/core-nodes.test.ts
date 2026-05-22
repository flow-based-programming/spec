import type { Graph } from '@fbp/types';
import { evaluate } from '../src/evaluate';
import { coreDefinitions, jsonSelectDef, jsonObjectDef, flowGuardDef, stringTemplateDef, stringConcatDef } from '../__fixtures__/core-definitions';
import { mathDefinitions } from '../__fixtures__/math-definitions';

describe('core nodes', () => {
  describe('json/select', () => {
    it('should extract a value by simple path', async () => {
      const graph: Graph = {
        name: 'json-select-simple',
        nodes: [
          { 
            name: 'input_data', 
            type: 'graphInput',
            props: [
              { name: 'portName', type: 'string', value: 'data' },
              { name: 'default', type: 'json', value: { user: { name: 'Alice', age: 30 } } }
            ]
          },
          { 
            name: 'select', 
            type: 'json/select',
            props: [{ name: 'path', type: 'string', value: 'user.name' }]
          }
        ],
        edges: [
          { src: { node: 'input_data', port: 'value' }, dst: { node: 'select', port: 'obj' } }
        ]
      };

      const result = await evaluate(graph, {
        definitions: coreDefinitions,
        outputNode: 'select',
        outputPort: 'value'
      });

      expect(result).toBe('Alice');
    });

    it('should extract a nested value', async () => {
      const graph: Graph = {
        name: 'json-select-nested',
        nodes: [
          { 
            name: 'input_data', 
            type: 'graphInput',
            props: [
              { name: 'portName', type: 'string', value: 'data' },
              { name: 'default', type: 'json', value: { response: { data: { users: [{ id: 1 }, { id: 2 }] } } } }
            ]
          },
          { 
            name: 'select', 
            type: 'json/select',
            props: [{ name: 'path', type: 'string', value: 'response.data.users.1.id' }]
          }
        ],
        edges: [
          { src: { node: 'input_data', port: 'value' }, dst: { node: 'select', port: 'obj' } }
        ]
      };

      const result = await evaluate(graph, {
        definitions: coreDefinitions,
        outputNode: 'select',
        outputPort: 'value'
      });

      expect(result).toBe(2);
    });

    it('should return undefined for missing path', async () => {
      const graph: Graph = {
        name: 'json-select-missing',
        nodes: [
          { 
            name: 'input_data', 
            type: 'graphInput',
            props: [
              { name: 'portName', type: 'string', value: 'data' },
              { name: 'default', type: 'json', value: { foo: 'bar' } }
            ]
          },
          { 
            name: 'select', 
            type: 'json/select',
            props: [{ name: 'path', type: 'string', value: 'baz.qux' }]
          }
        ],
        edges: [
          { src: { node: 'input_data', port: 'value' }, dst: { node: 'select', port: 'obj' } }
        ]
      };

      const result = await evaluate(graph, {
        definitions: coreDefinitions,
        outputNode: 'select',
        outputPort: 'value'
      });

      expect(result).toBeUndefined();
    });
  });

  describe('json/object', () => {
    it('should build an object from inputs', async () => {
      // For this test, we need to use the jsonObjectDef directly since it has dynamic inputs
      const result = jsonObjectDef.impl!(
        { email: 'test@example.com', name: 'Alice' },
        {}
      );

      expect(result).toEqual({
        value: { email: 'test@example.com', name: 'Alice' }
      });
    });

    it('should handle empty inputs', async () => {
      const result = jsonObjectDef.impl!({}, {});
      expect(result).toEqual({ value: {} });
    });
  });

  describe('flow/guard', () => {
    it('should pass when ok is true', async () => {
      const result = flowGuardDef.impl!(
        { ok: true, error: null },
        {}
      );

      expect(result).toEqual({
        pass: true,
        fail: false,
        error: null
      });
    });

    it('should fail when ok is false', async () => {
      const result = flowGuardDef.impl!(
        { ok: false, error: { message: 'Something went wrong' } },
        {}
      );

      expect(result).toEqual({
        pass: false,
        fail: true,
        error: { message: 'Something went wrong' }
      });
    });

    it('should provide default error message when none given', async () => {
      const result = flowGuardDef.impl!(
        { ok: false },
        {}
      );

      expect(result).toEqual({
        pass: false,
        fail: true,
        error: { message: 'Guard condition failed' }
      });
    });
  });

  describe('string/template', () => {
    it('should substitute placeholders', async () => {
      const result = stringTemplateDef.impl!(
        { token: 'abc123' },
        { template: 'Bearer {{token}}' }
      );

      expect(result).toEqual({ value: 'Bearer abc123' });
    });

    it('should handle multiple placeholders', async () => {
      const result = stringTemplateDef.impl!(
        { first: 'Hello', second: 'World' },
        { template: '{{first}} {{second}}!' }
      );

      expect(result).toEqual({ value: 'Hello World!' });
    });

    it('should keep placeholder if value is missing', async () => {
      const result = stringTemplateDef.impl!(
        { first: 'Hello' },
        { template: '{{first}} {{missing}}' }
      );

      expect(result).toEqual({ value: 'Hello {{missing}}' });
    });

    it('should return empty string for empty template', async () => {
      const result = stringTemplateDef.impl!({}, { template: '' });
      expect(result).toEqual({ value: '' });
    });
  });

  describe('string/concat', () => {
    it('should concatenate with prefix', async () => {
      const result = stringConcatDef.impl!(
        { value: 'token123' },
        { prefix: 'Bearer ', suffix: '' }
      );

      expect(result).toEqual({ value: 'Bearer token123' });
    });

    it('should concatenate with suffix', async () => {
      const result = stringConcatDef.impl!(
        { value: 'hello' },
        { prefix: '', suffix: '!' }
      );

      expect(result).toEqual({ value: 'hello!' });
    });

    it('should concatenate with both prefix and suffix', async () => {
      const result = stringConcatDef.impl!(
        { value: 'world' },
        { prefix: 'Hello, ', suffix: '!' }
      );

      expect(result).toEqual({ value: 'Hello, world!' });
    });
  });
});
