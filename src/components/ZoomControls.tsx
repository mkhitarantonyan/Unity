import React from 'react';
import { Plus, Minus, Maximize, MousePointer2, BoxSelect } from 'lucide-react';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ 
  onZoomIn, 
  onZoomOut, 
  onReset,
  isSelectionMode,
  onToggleSelectionMode
}) => {
  return (
    <div className="absolute bottom-8 left-8 flex flex-col gap-2 z-30">
      <div className="flex flex-col bg-[#141414] border border-[#262626] overflow-hidden">
        <button 
          onClick={onZoomIn}
          className="p-3 hover:bg-[#262626] transition-colors border-b border-[#262626]"
          title="Zoom In"
        >
          <Plus size={18} />
        </button>
        <button 
          onClick={onZoomOut}
          className="p-3 hover:bg-[#262626] transition-colors border-b border-[#262626]"
          title="Zoom Out"
        >
          <Minus size={18} />
        </button>
        <button 
          onClick={onReset}
          className="p-3 hover:bg-[#262626] transition-colors"
          title="Reset View"
        >
          <Maximize size={18} />
        </button>
      </div>

      <button 
        onClick={onToggleSelectionMode}
        className={`p-3 border transition-all flex items-center gap-2 uppercase text-[10px] font-bold tracking-widest ${
          isSelectionMode 
            ? 'bg-[#FF5733] border-[#FF5733] text-white shadow-[0_0_15px_rgba(255,87,51,0.3)]' 
            : 'bg-[#141414] border-[#262626] text-gray-400 hover:border-gray-600'
        }`}
        title={isSelectionMode ? "Multi-Selection Active" : "Click to Enable Multi-Selection"}
      >
        {isSelectionMode ? <BoxSelect size={18} /> : <MousePointer2 size={18} />}
        <span className="hidden sm:inline">{isSelectionMode ? 'Selection On' : 'Selection Off'}</span>
      </button>
    </div>
  );
};
