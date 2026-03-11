import React from 'react';
import { Plus, Minus, Maximize } from 'lucide-react';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ 
  onZoomIn, 
  onZoomOut, 
  onReset
}) => {
  return (
    <div className="fixed bottom-36 right-4 sm:bottom-8 sm:left-[220px] flex flex-col gap-2 z-40">
      <div className="flex flex-col bg-[#141414]/90 backdrop-blur-md border border-[#262626] overflow-hidden shadow-2xl">
        <button 
          onClick={onZoomIn}
          className="p-3 hover:bg-[#262626] transition-colors border-b border-[#262626] text-white"
          title="Zoom In"
        >
          <Plus size={20} />
        </button>
        <button 
          onClick={onZoomOut}
          className="p-3 hover:bg-[#262626] transition-colors border-b border-[#262626] text-white"
          title="Zoom Out"
        >
          <Minus size={20} />
        </button>
        <button 
          onClick={onReset}
          className="p-3 hover:bg-[#262626] transition-colors text-white"
          title="Reset View"
        >
          <Maximize size={20} />
        </button>
      </div>
    </div>
  );
};