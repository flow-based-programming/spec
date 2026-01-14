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
export interface Node {
  name: string;
  kind?: NodeKind;
  context: string;
  category: string;
  type: string;
  meta?: Metadata;
  inputs?: Port[];
  outputs?: Port[];
  props?: Prop[];
  nodes?: Node[];
  edges?: Edge[];
  groups?: Group[];
}