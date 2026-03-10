import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, X } from 'lucide-react';
import { Unit } from '../hooks/useGrid';

interface FloatingMenuProps {
  activeMenu: { unit: Unit; x: number; y: number } | null;
  onClose: () => void;
}

export const FloatingMenu: React.FC<FloatingMenuProps> = ({ activeMenu, onClose }) => {
  // Если у пикселя нет ссылки, нам не нужно показывать это всплывающее меню 
  // (весь остальной функционал есть в Sidebar)
  if (activeMenu && !activeMenu.unit.metadata?.link) {
    return null;
  }

  return (
    <AnimatePresence>
      {activeMenu && activeMenu.unit.metadata?.link && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          style={{ 
            left: activeMenu.x, 
            // Показываем ВЫШЕ курсора (y - 20) и сдвигаем весь блок вверх (-100%), 
            // чтобы он вообще не перекрывал пиксель, по которому кликнули
            top: activeMenu.y - 20,
            transform: 'translate(-50%, -100%)'
          }}
          className="absolute z-[100] bg-[#141414]/90 backdrop-blur-md border border-[#262626] p-1.5 rounded-xl shadow-2xl flex items-center gap-1"
        >
          <button
            onClick={() => {
              window.open(activeMenu.unit.metadata.link, '_blank');
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 hover:bg-[#FF5733] hover:text-white bg-white/5 transition-colors text-[10px] font-bold uppercase tracking-widest rounded-lg text-[#FF5733]"
          >
            <ExternalLink size={14} />
            Visit Link
          </button>

          <div className="w-[1px] h-4 bg-[#262626] mx-1" />

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 transition-colors text-gray-500 hover:text-white rounded-lg"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};