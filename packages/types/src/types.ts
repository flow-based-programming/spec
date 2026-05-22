export interface Metadata {
  x?: number;
  y?: number;
  description?: string;
  [key: string]: any;
}
export interface Port {
  name: string;
  type: string;
  description?: string;
  optional?: boolean;
  multi?: boolean;
}
export interface Ref {
  ref: string;
}
export interface Prop {
  name: string;
  type: string;
  value?: Ref | any;
  description?: string;
}
export interface PropDefinition {
  name: string;
  type: string;
  default?: any;
  description?: string;
  required?: boolean;
}
export interface EdgeEndpoint {
  node: string;
  port: string;
}
export interface Edge {
  src: EdgeEndpoint;
  dst: EdgeEndpoint;
  channel?: string;
  meta?: Metadata;
}
export interface Group {
  name: string;
  nodes: string[];
  meta?: Metadata;
}
export type NodeKind = "node" | "subnet" | "graphInput" | "graphOutput" | "graphProp";
export interface NodeDefinition {
  type: string;
  category?: string;
  inputs?: Port[];
  outputs?: Port[];
  props?: PropDefinition[];
  graph?: Graph;
  volatile?: boolean;
  description?: string;
  icon?: string;
}
export interface Node {
  name: string;
  type: string;
  kind?: NodeKind;
  meta?: Metadata;
  props?: Prop[];
  inputs?: Port[];
  outputs?: Port[];
  nodes?: Node[];
  edges?: Edge[];
  groups?: Group[];
}
export interface Graph {
  name: string;
  definitions?: NodeDefinition[];
  inputs?: Port[];
  outputs?: Port[];
  props?: PropDefinition[];
  nodes: Node[];
  edges: Edge[];
  groups?: Group[];
  meta?: Metadata;
}