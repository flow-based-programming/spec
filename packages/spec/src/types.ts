export interface NodeMeta {
  x?: number;
  y?: number;
  description?: string;
}
export interface PortRef {
  node: string;
  port: string;
}
export interface Edge {
  src: PortRef;
  dst: PortRef;
  channel?: string;
}
export interface PropValue {
  name: string;
  value?: any;
  ref?: boolean;
}
export interface Node {
  name: string;
  type: string;
  context?: string;
  meta?: NodeMeta;
  props?: PropValue[];
  nodes?: Node[];
  edges?: Edge[];
}
export interface Graph {
  name?: string;
  context?: string;
  nodes: Node[];
  edges: Edge[];
  definitions?: NodeDefinition[];
  meta?: NodeMeta;
}
export interface PortDef {
  name: string;
  type?: string;
  schema?: Record<string, any>;
  multi?: boolean;
  description?: string;
}
export interface PropDef {
  name: string;
  type?: string;
  schema?: Record<string, any>;
  default?: any;
  description?: string;
  required?: boolean;
  options?: string[];
}
export interface NodeDefinition {
  context: string;
  name: string;
  category: string;
  inputs?: PortDef[];
  outputs?: PortDef[];
  props?: PropDef[];
  graph?: Graph;
  volatile?: boolean;
  runtime?: string;
  icon?: string;
  description?: string;
}