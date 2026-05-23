import React, { useState } from 'react';
import { useGraph } from '../context/GraphContext';
import type { NodeDefinition } from '@fbp/types';

interface HotkeyItemProps {
  keys: string;
  description: string;
}

function HotkeyItem({ keys, description }: HotkeyItemProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 font-mono text-[10px]">
        {keys}
      </kbd>
      <span className="text-slate-400">{description}</span>
    </div>
  );
}

interface NodePaletteItemProps {
  definition: NodeDefinition;
  onDragStart: (definition: NodeDefinition) => void;
}

function NodePaletteItem({ definition, onDragStart }: NodePaletteItemProps) {
  const shortName = definition.name.split('/').pop() || definition.name;
  
  return (
    <div
      draggable
      onDragStart={() => onDragStart(definition)}
      className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded cursor-grab text-xs text-slate-300 transition-colors"
      title={definition.name}
    >
      {shortName}
    </div>
  );
}

export function Toolbar() {
  const { state, dispatch } = useGraph();
  const [showHotkeys, setShowHotkeys] = useState(true);
  const [showPalette, setShowPalette] = useState(true);
  
  const definitions = Array.from(state.definitions.values());
  
  const groupedDefinitions = definitions.reduce((acc, def) => {
    const category = def.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(def);
    return acc;
  }, {} as Record<string, NodeDefinition[]>);

  const handleDragStart = (definition: NodeDefinition) => {
    const event = new CustomEvent('node-drag-start', { detail: definition });
    window.dispatchEvent(event);
  };

  const handleAddNode = (definition: NodeDefinition) => {
    const newNode = {
      name: `${definition.name.split('/').pop()}_${Date.now().toString(36)}`,
      type: definition.name,
      meta: { x: 200, y: 200 }
    };
    dispatch({ type: 'ADD_NODE', node: newNode });
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
      <div className="flex justify-between p-3 gap-3">
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur rounded-lg border border-slate-700 shadow-xl">
          <button
            onClick={() => setShowPalette(!showPalette)}
            className="w-full px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-t-lg flex items-center justify-between"
          >
            <span>Node Palette</span>
            <span className="text-slate-500">{showPalette ? '−' : '+'}</span>
          </button>
          
          {showPalette && (
            <div className="p-2 border-t border-slate-700 max-h-80 overflow-y-auto">
              {Object.entries(groupedDefinitions).map(([category, defs]) => (
                <div key={category} className="mb-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 px-1">
                    {category}
                  </div>
                  <div className="flex flex-col gap-1">
                    {defs.map(def => (
                      <div
                        key={`${def.context}:${def.name}`}
                        onClick={() => handleAddNode(def)}
                        className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded cursor-pointer text-xs text-slate-300 transition-colors"
                        title={`Click to add ${def.name}`}
                      >
                        {def.name.split('/').pop()}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {definitions.length === 0 && (
                <div className="text-xs text-slate-500 px-1">No node definitions</div>
              )}
            </div>
          )}
        </div>

        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur rounded-lg border border-slate-700 shadow-xl">
          <button
            onClick={() => setShowHotkeys(!showHotkeys)}
            className="w-full px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-t-lg flex items-center justify-between"
          >
            <span>Keyboard Shortcuts</span>
            <span className="text-slate-500">{showHotkeys ? '−' : '+'}</span>
          </button>
          
          {showHotkeys && (
            <div className="p-3 border-t border-slate-700 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Selection</div>
              <HotkeyItem keys="Click" description="Select node" />
              <HotkeyItem keys="Shift+Click" description="Add to selection" />
              <HotkeyItem keys="Shift+Drag" description="Box select" />
              <HotkeyItem keys="⌘/Ctrl+A" description="Select all" />
              <HotkeyItem keys="Escape" description="Clear selection" />
              
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-3 mb-2">Editing</div>
              <HotkeyItem keys="Delete" description="Delete selected" />
              <HotkeyItem keys="⌘/Ctrl+D" description="Duplicate" />
              
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-3 mb-2">Navigation</div>
              <HotkeyItem keys="Alt+Drag" description="Pan canvas" />
              <HotkeyItem keys="⌘/Ctrl+Scroll" description="Zoom" />
              <HotkeyItem keys="Enter" description="Dive into subnet" />
              <HotkeyItem keys="U" description="Go up from subnet" />
              
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-3 mb-2">Connections</div>
              <HotkeyItem keys="Drag port" description="Create edge" />
              <HotkeyItem keys="Click edge" description="Select edge" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
