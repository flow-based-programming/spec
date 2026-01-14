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
  dialect?: string;
}
export interface Param {
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
export type NodeKind = "node" | "subnet" | "graphInput" | "graphOutput";
export interface Node {
  name: string;
  kind?: NodeKind;
  context: string;
  category: string;
  type: string;
  typeVersion?: number;
  meta?: Metadata;
  inputs?: Port[];
  outputs?: Port[];
  params?: Param[];
  nodes?: Node[];
  edges?: Edge[];
  groups?: Group[];
}