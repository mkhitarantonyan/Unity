import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BoxSelect, Image as ImageIcon } from 'lucide-react';
import { Unit } from '../../hooks/useGrid';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  myUnits: Unit[];
  myTotalValue: number;
  setSelectedUnitIds: (ids: number[]) => void;
  setFocusUnitId: (id: number | null) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ 
  isOpen, 
  onClose, 
  myUnits, 
  myTotalValue, 
  setSelectedUnitIds, 
  setFocusUnitId 
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          className="bg-[#0a0a0a] border border-[#262626] rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col relative overflow-hidden"
        >
          <div className="p-8 border-b border-[#262626] flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white uppercase tracking-widest">My Portfolio</h2>
              <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">Manage your digital real estate</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[#262626] rounded-xl transition-colors text-gray-500 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#141414] p-6 rounded-2xl border border-[#262626]">
                <div className="text-3xl font-bold text-white">{myUnits.length}</div>
                <div className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Owned Units</div>
              </div>
              <div className="bg-[#141414] p-6 rounded-2xl border border-[#262626]">
                <div className="text-3xl font-bold text-[#FF5733]">{myTotalValue.toFixed(2)}</div>
                <div className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Total Value (UNIT)</div>
              </div>
            </div>

            {myUnits.length > 0 ? (
              <>
                <button 
                  onClick={() => {
                    setSelectedUnitIds(myUnits.map(u => u.id));
                    setFocusUnitId(myUnits?.id || null); // Исправлен фокус
                    onClose();
                  }}
                  className="w-full bg-[#141414] border border-[#262626] hover:border-[#FF5733] hover:text-[#FF5733] text-white py-4 font-bold uppercase tracking-[0.2em] text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <BoxSelect size={16} /> Select All Assets For Bulk Edit
                </button>

                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-4">Detailed List</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {myUnits.map(unit => (
                      <button
                        key={unit.id}
                        onClick={() => {
                          setSelectedUnitIds([unit.id]);
                          setFocusUnitId(unit.id);
                          onClose();
                        }}
                        className="text-left bg-[#141414] hover:border-[#FF5733] p-4 rounded-xl border border-[#262626] transition-colors flex items-center gap-4 group"
                      >
                        {unit.metadata.image_url ? (
                          <img src={unit.metadata.image_url} alt="unit" className="w-10 h-10 object-cover rounded bg-black" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-[#FF5733]/10 border border-[#FF5733]/30 flex items-center justify-center">
                            <ImageIcon size={16} className="text-[#FF5733]" />
                          </div>
                        )}
                        <div>
                          <div className="text-white text-sm font-bold group-hover:text-[#FF5733] transition-colors">Unit #{unit.id}</div>
                          <div className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">
                            ({unit.x}, {unit.y}) • {unit.sale_price.toFixed(2)} UNIT
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 text-sm uppercase tracking-widest">You don't own any units yet.</div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};