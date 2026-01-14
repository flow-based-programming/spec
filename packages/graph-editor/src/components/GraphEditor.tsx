import React from 'react';
import { GraphProvider } from '../context/GraphContext';
import { GraphCanvas } from './GraphCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { NodePalette } from './NodePalette';
import { StatusBar } from './StatusBar';
import type { Graph, NodeDefinition } from '@fbp/types';

interface GraphEditorProps {
  graph?: Graph;
  definitions?: NodeDefinition[];
  showPropertiesPanel?: boolean;
  showNodePalette?: boolean;
  showStatusBar?: boolean;
  className?: string;
  onGraphChange?: (graph: Graph) => void;
}

export function GraphEditor({
  graph,
  definitions,
  showPropertiesPanel = true,
  showNodePalette = true,
  showStatusBar = true,
  className = ''
}: GraphEditorProps) {
  return (
    <GraphProvider initialGraph={graph} externalDefinitions={definitions}>
      <div className={`flex flex-col h-full bg-slate-900 ${className}`}>
        <div className="h-10 bg-slate-800 border-b border-slate-700 flex items-center px-4 flex-shrink-0">
          <span className="text-sm font-medium text-slate-300">FBP Graph Editor</span>
          <span className="ml-3 text-xs text-slate-500">Flow-Based Programming</span>
        </div>
        
        <div className="flex flex-1 min-h-0">
          {showNodePalette && (
            <div className="w-48 flex-shrink-0 border-r border-slate-700 bg-slate-850">
              <NodePalette />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <GraphCanvas />
          </div>
          
          {showPropertiesPanel && (
            <div className="w-72 flex-shrink-0 border-l border-slate-700">
              <PropertiesPanel />
            </div>
          )}
        </div>
        
        {showStatusBar && <StatusBar />}
      </div>
    </GraphProvider>
  );
}
