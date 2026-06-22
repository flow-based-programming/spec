import type { NodeDefinition } from '@fbp/types';

/**
 * A function that implements a node's computation.
 * Takes inputs (keyed by port name) and props, returns outputs (keyed by port name).
 * Can be sync or async - the evaluator will await the result.
 */
export type NodeImplFn = (
  inputs: Record<string, any>,
  props: Record<string, any>
) => Record<string, any> | Promise<Record<string, any>>;

/**
 * A NodeDefinition extended with an optional implementation function.
 * The impl function is not part of the JSON schema (not serializable),
 * but is used at runtime for evaluation.
 */
export interface NodeDefinitionWithImpl extends NodeDefinition {
  impl?: NodeImplFn;
}

/**
 * Options for the evaluate function.
 */
export interface EvaluateOptions {
  /** Node definitions with implementations */
  definitions: NodeDefinitionWithImpl[];
  /** The node to get output from */
  outputNode: string;
  /** The port to get output from */
  outputPort: string;
  /** External inputs to provide to graphInput nodes (keyed by portName property value) */
  inputs?: Record<string, any>;
  /** Props to provide to graphProp nodes (keyed by propName property value) */
  props?: Record<string, any>;
}
