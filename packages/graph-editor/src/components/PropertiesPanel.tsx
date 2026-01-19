import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useGraph, useSelection, useScopedGraph } from '../context/GraphContext';
import type { PropDefinition, Prop, Graph } from '@fbp/types';
import { clsx } from 'clsx';
import { CodeEditor } from './CodeEditor';

const BOUNDARY_PREFIXES = ['@in:', '@out:', '@prop:'];

// Type for evaluate function passed from parent
type EvaluateFn = (graph: Graph, options: { definitions: any[]; outputNode: string; outputPort: string }) => Promise<any>;

interface PropertiesPanelProps {
  evaluationResult?: unknown;
  onRefreshEvaluation?: () => void;
  evaluateFn?: EvaluateFn;
  definitions?: any[];
}

export function PropertiesPanel({ evaluationResult: externalResult, onRefreshEvaluation, evaluateFn, definitions }: PropertiesPanelProps) {
  const { state, dispatch, getDefinition, getShortName, isChannelReference } = useGraph();
  const { selection } = useSelection();
  const { nodes: scopedNodes, edges: scopedEdges } = useScopedGraph();
  const [internalResult, setInternalResult] = useState<unknown>(undefined);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  
  // Hooks for editable node names - must be called unconditionally
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // Use internal result if we have evaluateFn, otherwise use external result
  const evaluationResult = evaluateFn ? internalResult : externalResult;

  const selectedNodeIds = Array.from(selection.nodeIds);
  
  // Get the selected node for evaluation (use scoped nodes for current scope level)
  const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;
  const selectedNode = selectedNodeId ? scopedNodes.find(n => n.name === selectedNodeId) : null;
  const isOutputNode = selectedNode?.type === 'core/graph/output';
  
  // Compute boundary node info (safe even when no node selected)
  const nodeName = selectedNode?.name || '';
  const isBoundaryNode = BOUNDARY_PREFIXES.some(prefix => nodeName.startsWith(prefix));
  const boundaryPrefix = BOUNDARY_PREFIXES.find(prefix => nodeName.startsWith(prefix)) || '';
  const editableNameValue = isBoundaryNode ? nodeName.slice(boundaryPrefix.length) : nodeName;
  
  // Sync editedName when selected node changes
  useEffect(() => {
    setEditedName(editableNameValue);
    setIsEditingName(false);
  }, [editableNameValue]);
  
  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);
  
  // Handlers for name editing
  const handleNameSubmit = useCallback(() => {
    if (editedName && editedName !== editableNameValue && nodeName) {
      const newFullName = isBoundaryNode ? `${boundaryPrefix}${editedName}` : editedName;
      dispatch({ type: 'RENAME_NODE', oldName: nodeName, newName: newFullName });
    }
    setIsEditingName(false);
  }, [editedName, editableNameValue, isBoundaryNode, boundaryPrefix, nodeName, dispatch]);
  
  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditedName(editableNameValue);
      setIsEditingName(false);
    }
  }, [handleNameSubmit, editableNameValue]);
  
  // Construct a scoped graph for evaluation (works at any cwd level)
  const scopedGraph = useMemo((): Graph => {
    return {
      name: state.cwd === '/' ? state.graph.name : `scope:${state.cwd}`,
      nodes: scopedNodes,
      edges: scopedEdges,
      inputs: state.graph.inputs,
      outputs: state.graph.outputs,
      props: state.graph.props,
      definitions: state.graph.definitions
    };
  }, [state.cwd, state.graph.name, state.graph.inputs, state.graph.outputs, state.graph.props, state.graph.definitions, scopedNodes, scopedEdges]);
  
  // Evaluate when output node is selected and we have evaluateFn
  const handleEvaluate = useCallback(async () => {
    if (!evaluateFn || !definitions || !selectedNodeId || !isOutputNode) return;
    
    setIsEvaluating(true);
    try {
      // Use scopedGraph instead of state.graph for evaluation at current cwd level
      const result = await evaluateFn(scopedGraph, {
        definitions,
        outputNode: selectedNodeId,
        outputPort: 'value'
      });
      setInternalResult(result);
    } catch (e) {
      console.error('Evaluation error:', e);
      setInternalResult(undefined);
    } finally {
      setIsEvaluating(false);
    }
  }, [evaluateFn, definitions, selectedNodeId, isOutputNode, scopedGraph]);
  
  // Auto-evaluate when output node is selected
  useEffect(() => {
    if (isOutputNode && evaluateFn && definitions) {
      handleEvaluate();
    } else if (!isOutputNode) {
      setInternalResult(undefined);
    }
  }, [selectedNodeId, isOutputNode, evaluateFn, definitions]);
  
  // Handle refresh - use internal evaluation if available, otherwise external
  // Always spin for a minimum duration so user gets visual feedback even on fast evaluations
  const handleRefresh = useCallback(() => {
    setIsSpinning(true);
    const minSpinTime = 400; // minimum spin duration in ms
    const spinStart = Date.now();

    const stopSpinning = () => {
      const elapsed = Date.now() - spinStart;
      const remaining = Math.max(0, minSpinTime - elapsed);
      setTimeout(() => setIsSpinning(false), remaining);
    };

    if (evaluateFn && definitions) {
      handleEvaluate().finally(stopSpinning);
    } else if (onRefreshEvaluation) {
      onRefreshEvaluation();
      stopSpinning();
    } else {
      stopSpinning();
    }
  }, [evaluateFn, definitions, handleEvaluate, onRefreshEvaluation]);
  
  if (selectedNodeIds.length === 0) {
    return (
      <div className="p-4 text-slate-400 text-sm">
        Select a node to view its properties
      </div>
    );
  }

  if (selectedNodeIds.length > 1) {
    return (
      <div className="p-4 text-slate-400 text-sm">
        {selectedNodeIds.length} nodes selected
      </div>
    );
  }

  const nodeId = selectedNodeIds[0];
  const node = scopedNodes.find(n => n.name === nodeId);
  
  if (!node) return null;

  const definition = getDefinition(node.type);
  const propDefs = definition?.props || [];

  const getPropValue = (propName: string): unknown => {
    const prop = node.props?.find(p => p.name === propName);
    return prop?.value;
  };

  const handlePropChange = (propName: string, value: unknown) => {
    dispatch({ type: 'SET_NODE_PROP', nodeId, propName, value });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700">
      <div className="p-3 border-b border-slate-700">
        <div className="text-xs text-slate-500 mb-1">Node</div>
        <div className="font-semibold text-white flex items-center gap-1">
          {isBoundaryNode && (
            <span className="text-slate-500">{boundaryPrefix}</span>
          )}
          {isBoundaryNode ? (
            isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={handleNameKeyDown}
                className="bg-slate-800 border border-blue-500 rounded px-1 py-0.5 text-white text-sm focus:outline-none"
                style={{ width: `${Math.max(editedName.length, 5) * 8 + 16}px` }}
              />
            ) : (
              <span 
                onClick={() => setIsEditingName(true)}
                className="cursor-pointer hover:bg-slate-700 px-1 py-0.5 rounded"
                title="Click to edit name"
              >
                {editableNameValue}
              </span>
            )
          ) : (
            <span>{node.name}</span>
          )}
        </div>
        <div className="text-xs text-slate-400 mt-1 font-mono">{node.type}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Properties</div>
        
        {propDefs.length === 0 ? (
          <div className="text-slate-500 text-sm">No properties defined</div>
        ) : (
          <div className="space-y-4">
            {propDefs.map(propDef => (
              <PropertyField
                key={propDef.name}
                definition={propDef}
                value={getPropValue(propDef.name)}
                onChange={(value) => handlePropChange(propDef.name, value)}
                isChannelRef={isChannelReference(getPropValue(propDef.name))}
                nodeType={node.type}
              />
            ))}
          </div>
        )}

        {node.type === 'core/graph/output' && (
          <div className="mt-6 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Evaluated Result</span>
              <button
                onClick={handleRefresh}
                disabled={isSpinning}
                className={clsx(
                  "p-1.5 rounded transition-colors",
                  isSpinning
                    ? "text-blue-400"
                    : "hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                )}
                title="Re-evaluate graph"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isSpinning ? "animate-spin" : ""}
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 21h5v-5" />
                </svg>
              </button>
            </div>
            {isEvaluating ? (
              <div className="text-slate-500 text-sm">Evaluating...</div>
            ) : evaluationResult !== undefined ? (
              <div className="bg-slate-800 rounded p-3 overflow-auto max-h-64">
                {typeof evaluationResult === 'number' ? (
                  <span className="text-2xl font-mono text-green-400">{evaluationResult}</span>
                ) : (
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                    {JSON.stringify(evaluationResult, null, 2)}
                  </pre>
                )}
              </div>
            ) : (
              <div className="text-slate-500 text-sm">Click refresh to evaluate</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface PropertyFieldProps {
  definition: PropDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  isChannelRef: boolean;
  nodeType?: string;
}

function PropertyField({ definition, value, onChange, isChannelRef, nodeType }: PropertyFieldProps) {
  const displayValue = value ?? definition.default ?? '';
  
  // Check if this property should use a code editor (e.g., GraphQL document field)
  const isGraphQLDocument = nodeType === 'net/graphql/request' && definition.name === 'document';
  const isCodeField = isGraphQLDocument;

  const renderInput = () => {
    switch (definition.type.toLowerCase()) {
      case 'boolean':
        return (
          <button
            onClick={() => onChange(!displayValue)}
            className={clsx(
              'w-10 h-5 rounded-full transition-colors relative',
              displayValue ? 'bg-blue-500' : 'bg-slate-600'
            )}
          >
            <span
              className={clsx(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                displayValue ? 'left-5' : 'left-0.5'
              )}
            />
          </button>
        );

      case 'number':
        return (
          <input
            type="number"
            value={displayValue as number}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className={clsx(
              'w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-600',
              'text-white text-sm focus:outline-none focus:border-blue-500',
              isChannelRef && 'font-mono text-purple-400'
            )}
          />
        );

      case 'enum':
      case 'select':
        const options = (definition as any).options || [];
        return (
          <select
            value={displayValue as string}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            {options.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      default:
        // Use CodeEditor for GraphQL document and other code fields
        if (isCodeField) {
          return (
            <CodeEditor
              value={displayValue as string}
              onChange={onChange}
              language={isGraphQLDocument ? 'graphql' : 'javascript'}
              placeholder={isGraphQLDocument ? 'query { ... }' : ''}
            />
          );
        }
        
        return (
          <input
            type="text"
            value={displayValue as string}
            onChange={(e) => onChange(e.target.value)}
            className={clsx(
              'w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-600',
              'text-white text-sm focus:outline-none focus:border-blue-500',
              isChannelRef && 'font-mono text-purple-400'
            )}
          />
        );
    }
  };

  return (
    <div>
      <label className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-slate-300">{definition.name}</span>
        {isChannelRef && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900 text-purple-300">
            ref
          </span>
        )}
      </label>
      {renderInput()}
      {definition.description && (
        <p className="text-xs text-slate-500 mt-1">{definition.description}</p>
      )}
    </div>
  );
}
