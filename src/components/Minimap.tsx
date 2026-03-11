import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Unit } from '../hooks/useGrid';

interface MinimapProps {
  units: Unit[];
  viewportDataRef: React.MutableRefObject<{ x: number; y: number; w: number; h: number }>;
  onNavigate: (unitId: number) => void;
  isSidebarOpen: boolean;
}

export const Minimap: React.FC<MinimapProps> = ({ units, viewportDataRef, onNavigate, isSidebarOpen }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // === ИСПРАВЛЕНО: Теперь по умолчанию TRUE (свернуто) ===
  const [isMinimized, setIsMinimized] = useState(true);

  // 1. Кэшируем статичную сетку 100x100
  useEffect(() => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
      offscreenCanvasRef.current.width = 100;
      offscreenCanvasRef.current.height = 100;
    }
    const ctx = offscreenCanvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, 100, 100);

    units.forEach(u => {
      if (u.owner_id) {
        ctx.fillStyle = u.metadata?.is_for_sale ? '#10B981' : '#FF5733'; 
        ctx.fillRect(u.x, u.y, 1, 1);
      } else {
        ctx.fillStyle = '#262626';
        ctx.fillRect(u.x, u.y, 1, 1);
      }
    });
  }, [units]);

  // 2. Рендерим 60 FPS (с паузой при сворачивании)
  useEffect(() => {
    if (isMinimized) return; // Экономим ресурсы, если закрыто

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      if (offscreenCanvasRef.current) {
        ctx.drawImage(offscreenCanvasRef.current, 0, 0);
      }

      const { x, y, w, h } = viewportDataRef.current;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, 100, y); 
      ctx.fillRect(0, y + h, 100, 100 - (y + h)); 
      ctx.fillRect(0, y, x, h); 
      ctx.fillRect(x + w, y, 100 - (x + w), h); 

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [viewportDataRef, isMinimized]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const scaleX = 100 / rect.width;
    const scaleY = 100 / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    
    if (x >= 0 && x < 100 && y >= 0 && y < 100) {
      const unitId = y * 100 + x;
      onNavigate(unitId);
    }
  };

  return (
    <div 
      className={`fixed bottom-8 z-30 bg-[#141414]/90 backdrop-blur-md p-3 border border-[#262626] rounded-2xl shadow-2xl pointer-events-auto transition-all duration-500 ease-in-out ${
        isSidebarOpen ? 'right-8 sm:right-[432px]' : 'right-8'
      }`}
    >
      {/* Шапка радара */}
      <div 
        className="flex justify-between items-center gap-6 cursor-pointer group"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="text-[8px] uppercase tracking-widest text-gray-400 font-bold flex items-center gap-2 group-hover:text-white transition-colors">
          <div className={`w-1.5 h-1.5 rounded-full ${isMinimized ? 'bg-gray-600' : 'bg-[#FF5733] animate-pulse'}`} />
          <span>Live Radar</span>
        </div>
        <div className="text-gray-500 group-hover:text-white transition-colors">
          {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>
      
      {/* Контент (Canvas) */}
      <div className={`transition-all duration-300 overflow-hidden ${isMinimized ? 'max-h-0 opacity-0' : 'max-h-64 opacity-100 mt-3'}`}>
        <canvas 
          ref={canvasRef}
          width={100} 
          height={100} 
          onClick={handleClick}
          className="w-32 h-32 sm:w-40 sm:h-40 cursor-crosshair border border-[#262626] rounded-lg image-pixelated hover:border-[#FF5733] transition-colors"
        />
        
        <div className="flex justify-between mt-3 text-[7px] uppercase tracking-widest font-bold text-gray-500">
          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#FF5733]"></div> Owned</div>
          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div> Sale</div>
          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 border border-white/50"></div> View</div>
        </div>
      </div>
    </div>
  );
};