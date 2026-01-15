import type { NodeDefinition, PropDefinition } from '@fbp/types';

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
 * Extended PropDefinition with runtime-only options for enum/select types.
 * The options field is not part of the JSON schema but is used by the UI.
 */
export interface PropDefinitionWithOptions extends PropDefinition {
  options?: string[];
}

/**
 * A NodeDefinition extended with an optional implementation function.
 * The impl function is not part of the JSON schema (not serializable),
 * but is used at runtime for evaluation.
 */
export interface NodeDefinitionWithImpl extends Omit<NodeDefinition, 'props'> {
  props?: PropDefinitionWithOptions[];
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
  /** External inputs to provide to @in/ nodes */
  inputs?: Record<string, any>;
  /** Props to provide to @prop/ nodes */
  props?: Record<string, any>;
}
