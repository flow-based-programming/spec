/**
 * @fbp/spec
 * 
 * Two-layer type system for flow-based programming graphs:
 * 
 * 1. STORAGE TYPES (./types.ts)
 *    - Minimal, canonical data for persistence
 *    - No derived data, no runtime state
 *    - Boundary nodes ARE the interface definition
 * 
 * 2. RENDERER TYPES (./renderer.ts)
 *    - Extended types with derived port data
 *    - Runtime state (selection, view, etc.)
 *    - Used by the graph editor UI
 * 
 * 3. SPEC API (./api.ts)
 *    - Pure functions for path-based graph manipulation
 *    - insertNode, removeNode, setProps, addEdge, etc.
 */

// Storage types (for persistence)
export * from './types';

// Renderer types (for UI)
export * from './renderer';

// Spec API (for manipulation)
export * from './api';
