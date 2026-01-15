import React from 'react';
import { useGraph } from '../context/GraphContext';
import type { NodeDefinition } from '@fbp/types';

const BOUNDARY_NODE_TYPES = ['core/graph/input', 'core/graph/output', 'core/graph/prop'];

export function NodePalette() {
  const { state, dispatch } = useGraph();
  
  const definitions = Array.from(state.definitions.values());
  
  const groupedDefinitions = definitions.reduce((acc, def) => {
    const category = def.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(def);
    return acc;
  }, {} as Record<string, NodeDefinition[]>);

  const handleAddNode = (definition: NodeDefinition) => {
    const position = { x: 200 + Math.random() * 100, y: 200 + Math.random() * 100 };
    
    // Handle boundary nodes specially
    if (BOUNDARY_NODE_TYPES.includes(definition.type)) {
      const boundaryType = definition.type === 'core/graph/input' ? 'input' 
        : definition.type === 'core/graph/output' ? 'output' 
        : 'prop';
      dispatch({ type: 'ADD_BOUNDARY_NODE', boundaryType, position });
      return;
    }
    
    const newNode = {
      name: `${definition.type.split('/').pop()}_${Date.now().toString(36)}`,
      type: definition.type,
      meta: position
    };
    dispatch({ type: 'ADD_NODE', node: newNode });
  };

  return (
    <div className="h-full flex flex-col bg-slate-800">
      <div className="px-3 py-2 border-b border-slate-700">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Nodes</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(groupedDefinitions).map(([category, defs]) => (
          <div key={category} className="mb-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5 px-1">
              {category}
            </div>
            <div className="flex flex-col gap-1">
              {defs.map(def => (
                <button
                  key={def.type}
                  onClick={() => handleAddNode(def)}
                  className="w-full px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-left text-xs text-slate-300 transition-colors flex items-center gap-2"
                  title={`Add ${def.type}`}
                >
                  {def.icon && <span className="text-sm opacity-70">{def.icon}</span>}
                  <span>{def.type.split('/').pop()}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {definitions.length === 0 && (
          <div className="text-xs text-slate-500 px-1 py-2">No node definitions available</div>
        )}
      </div>
    </div>
  );
}
