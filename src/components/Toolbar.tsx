import React from 'react';
import { MousePointer2, BoxSelect } from 'lucide-react';

interface ToolbarProps {
  isMobile: boolean;
  showGuides: boolean;
  setShowGuides: (show: boolean) => void;
  isSelectionMode: boolean;
  setIsSelectionMode: (mode: boolean) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  isMobile,
  showGuides,
  setShowGuides,
  isSelectionMode,
  setIsSelectionMode
}) => {
  return (
    <div className={`fixed z-40 flex flex-col gap-2 transition-all duration-300 
      ${isMobile 
        ? 'top-[40%] -translate-y-1/2 right-4' 
        : 'bottom-8 left-8'                  
      }`}>

      {/* Кнопка Guides */}
      <button
        onClick={() => setShowGuides(!showGuides)}
        className={`flex items-center justify-center transition-all duration-300 border ${
          isMobile ? 'p-3' : 'px-4 py-3 gap-3'
        } ${
          showGuides 
            ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
            : 'bg-[#141414]/80 backdrop-blur-md border-[#262626] text-gray-400'
        }`}
      >
        <div className={`w-2 h-2 rounded-full ${showGuides ? 'bg-white animate-pulse' : 'bg-gray-600'} ${!isMobile ? 'mr-1' : ''}`} />
        {!isMobile && (
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold">
            Guides: {showGuides ? 'ON' : 'OFF'}
          </span>
        )}
      </button>

      {/* Кнопка Selection Mode */}
      <button
        onClick={() => setIsSelectionMode(!isSelectionMode)}
        className={`flex items-center justify-center transition-all duration-300 border ${
          isMobile ? 'p-3' : 'px-4 py-3 gap-3'
        } ${
          isSelectionMode 
            ? 'bg-[#FF5733] border-[#FF5733] text-white shadow-lg' 
            : 'bg-[#141414]/80 backdrop-blur-md border-[#262626] text-gray-400'
        }`}
      >
        {isSelectionMode ? <BoxSelect size={18} /> : <MousePointer2 size={18} />}
        {!isMobile && (
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold">
            Selection: {isSelectionMode ? 'ON' : 'OFF'}
          </span>
        )}
      </button>
    </div>
  );
};