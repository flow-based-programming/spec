import React from 'react';
import { useGraph, useSelection, useNavigation } from '../context/GraphContext';

export function StatusBar() {
  const { state } = useGraph();
  const { selection } = useSelection();
  const { navigationStack, canGoUp } = useNavigation();
  
  const selectedCount = selection.nodeIds.size + selection.edgeIds.size;
  const nodeCount = state.graph.nodes.length;
  const edgeCount = state.graph.edges.length;
  const zoomPercent = Math.round(state.view.zoom * 100);

  return (
    <div className="h-8 bg-slate-800 border-t border-slate-700 flex items-center px-4 text-xs text-slate-400 flex-shrink-0">
      <div className="flex items-center gap-4">
        {navigationStack.length > 0 && (
          <span className="text-slate-300">
            Path: {navigationStack.join(' / ')}
            <span className="ml-2 text-slate-500">(U to go up)</span>
          </span>
        )}
        
        <span>{nodeCount} nodes</span>
        <span>{edgeCount} edges</span>
        
        {selectedCount > 0 && (
          <span className="text-blue-400">{selectedCount} selected</span>
        )}
        
        <span>Zoom: {zoomPercent}%</span>
      </div>
      
      <div className="ml-auto flex items-center gap-3 text-slate-500">
        <span>
          <kbd className="px-1 py-0.5 bg-slate-700 rounded text-[10px] mr-1">Del</kbd>
          delete
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-slate-700 rounded text-[10px] mr-1">⌘D</kbd>
          duplicate
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-slate-700 rounded text-[10px] mr-1">Alt+Drag</kbd>
          pan
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-slate-700 rounded text-[10px] mr-1">⌘+Scroll</kbd>
          zoom
        </span>
      </div>
    </div>
  );
}
