import type { NodeDefinitionWithImpl } from '../src/types';

/**
 * Network node definitions with implementations.
 * These nodes handle GraphQL requests and related operations.
 */

/**
 * net/graphql/request - Execute GraphQL query or mutation
 * 
 * Props:
 * - document: string (GraphQL query/mutation document)
 * - operationName?: string (optional operation name)
 * - endpoint: string (GraphQL endpoint URL)
 * - timeout?: number (request timeout in ms, default 30000)
 * 
 * Inputs:
 * - variables: json (GraphQL variables)
 * - headers?: json (additional headers)
 * 
 * Outputs:
 * - data: json (response data)
 * - error?: json (error if any)
 * - ok: boolean (true if request succeeded without errors)
 */
export const graphqlRequestDef: NodeDefinitionWithImpl = {
  category: 'graphql',
  type: 'net/graphql/request',
  icon: 'graphql',
  inputs: [
    { name: 'variables', type: 'json' },
    { name: 'headers', type: 'json' }
  ],
  outputs: [
    { name: 'data', type: 'json' },
    { name: 'error', type: 'json' },
    { name: 'ok', type: 'boolean' }
  ],
  props: [
    { name: 'document', type: 'string', default: '' },
    { name: 'operationName', type: 'string' },
    { name: 'endpoint', type: 'string', default: '' },
    { name: 'timeout', type: 'number', default: 30000 }
  ],
  description: 'Execute a GraphQL query or mutation',
  impl: async (inputs, props) => {
    const { variables = {}, headers = {} } = inputs;
    const { document, operationName, endpoint, timeout = 30000 } = props;

    if (!endpoint) {
      return {
        data: null,
        error: { message: 'No endpoint specified' },
        ok: false
      };
    }

    if (!document) {
      return {
        data: null,
        error: { message: 'No document specified' },
        ok: false
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...headers
        },
        body: JSON.stringify({
          query: document,
          variables,
          operationName: operationName || undefined
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          data: null,
          error: { 
            message: `HTTP error: ${response.status} ${response.statusText}`,
            statusCode: response.status
          },
          ok: false
        };
      }

      const json = await response.json();

      if (json.errors && json.errors.length > 0) {
        return {
          data: json.data || null,
          error: json.errors,
          ok: false
        };
      }

      return {
        data: json.data || null,
        error: null,
        ok: true
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            data: null,
            error: { message: `Request timed out after ${timeout}ms` },
            ok: false
          };
        }
        return {
          data: null,
          error: { message: error.message },
          ok: false
        };
      }

      return {
        data: null,
        error: { message: String(error) },
        ok: false
      };
    }
  }
};

export const netDefinitions: NodeDefinitionWithImpl[] = [
  graphqlRequestDef
];
