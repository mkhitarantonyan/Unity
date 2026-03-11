// ZoomControls.tsx

// ... (интерфейс пропсов остается прежним)

export const ZoomControls: React.FC<ZoomControlsProps> = ({ 
  onZoomIn, 
  onZoomOut, 
  onReset,
  isSelectionMode,
  onToggleSelectionMode
}) => {
  return (
    /* ИСПРАВЛЕННЫЙ КЛАСС: 
       На мобилках (sm:...) меняем позицию. 
       Вместо bottom-8 ставим bottom-40 (чтобы быть выше панели покупки)
       Вместо left-8 ставим right-4 (чтобы быть под рукой)
    */
    <div className="fixed bottom-36 right-4 sm:bottom-8 sm:left-8 flex flex-col gap-2 z-40">
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

      <button 
        onClick={onToggleSelectionMode}
        className={`p-3 border transition-all flex items-center justify-center gap-2 uppercase text-[10px] font-bold tracking-widest ${
          isSelectionMode 
            ? 'bg-[#FF5733] border-[#FF5733] text-white shadow-[0_0_15px_rgba(255,87,51,0.3)]' 
            : 'bg-[#141414]/90 backdrop-blur-md border-[#262626] text-gray-400 hover:border-gray-600'
        }`}
        title={isSelectionMode ? "Multi-Selection Active" : "Click to Enable Multi-Selection"}
      >
        {isSelectionMode ? <BoxSelect size={20} /> : <MousePointer2 size={20} />}
        {/* Скрываем текст на совсем маленьких экранах, оставляем только иконку */}
        <span className="hidden md:inline">{isSelectionMode ? 'Selection On' : 'Selection Off'}</span>
      </button>
    </div>
  );
};