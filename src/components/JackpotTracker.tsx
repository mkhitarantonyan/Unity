export const JackpotTracker: React.FC<JackpotTrackerProps> = ({ soldCount }) => {
  const progress = Math.min((soldCount / 10000) * 100, 100);

  return (
    <div className="fixed top-[160px] left-6 z-40 flex flex-col items-start pointer-events-none border border-white/5 rounded-xl p-3 bg-black/40 backdrop-blur-md max-w-[200px]">
      
      <div className="flex flex-col items-start mb-2">
        <div className="flex flex-col">
           {/* ИЗМЕНЕНО: Более понятный заголовок */}
           <span className="text-[8px] text-[#FF5733] uppercase tracking-[0.2em] font-black mb-0.5">Secret Pixel Draw</span>
           <span className="text-white font-black italic text-xl tracking-tighter drop-shadow-[0_0_8px_rgba(255,87,51,0.3)]">
            $5,000.00
          </span>
        </div>
      </div>

      <div className="w-full space-y-1.5">
        <div className="w-full h-[1.5px] bg-white/5 overflow-hidden relative rounded-full">
          <div 
            className="h-full bg-[#FF5733] shadow-[0_0_8px_#FF5733] transition-all duration-1000 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* ИЗМЕНЕНО: Добавлена прямая инструкция */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-[7px] text-gray-500 font-mono tracking-widest uppercase">
              {soldCount.toLocaleString()} / 10k sold
            </span>
          </div>
          <p className="text-[7px] text-gray-400 leading-tight uppercase tracking-tighter">
            One random unit owner wins <br/> when the grid is 100% full.
          </p>
        </div>
      </div>
    </div>
  );
};