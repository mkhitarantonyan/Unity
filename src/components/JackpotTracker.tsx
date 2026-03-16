export const JackpotTracker: React.FC<JackpotTrackerProps> = ({ soldCount }) => {
  const progress = Math.min((soldCount / 10000) * 100, 100);

  return (
    <div className="fixed top-[160px] left-6 z-40 flex flex-col items-start pointer-events-none border border-white/5 rounded-xl p-3 bg-black/40 backdrop-blur-md max-w-[200px]">
      
      <div className="flex flex-col items-start mb-2">
        <div className="flex flex-col">
           {/* ИЗМЕНЕНО: Более понятный заголовок */}
           <span className="text-[8px] text-[#FF5733] uppercase tracking-[0.2em] font-black mb-0.5">Building a legacy, pixel by pixel. 10% for charity</span>
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
        </div>
      </div>
    </div>
  );
};