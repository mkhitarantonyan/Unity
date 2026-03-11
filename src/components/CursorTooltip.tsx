import React, { useState, useEffect } from 'react';

interface CursorTooltipProps {
  selectedCount: number;
}

export const CursorTooltip: React.FC<CursorTooltipProps> = ({ selectedCount }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Оптимизация: слушаем мышь ТОЛЬКО если выделен ровно 1 пиксель
    if (selectedCount !== 1) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [selectedCount]);

  // Если выделено 0 или больше 1 пикселя — вообще не рендерим компонент
  if (selectedCount !== 1) return null;

  return (
    <div
      className="fixed pointer-events-none z- bg-black text-white px-3 py-1.5 text-[10px] font-mono uppercase border border-white/20 tracking-widest shadow-xl hidden sm:block"
      style={{
        left: mousePos.x + 16,
        top: mousePos.y + 16,
      }}
    >
      Hold [SHIFT] to multi-select
    </div>
  );
};