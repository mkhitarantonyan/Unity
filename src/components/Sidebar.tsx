import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, ExternalLink, X, Upload, Image as ImageIcon, LogIn, Lock, Trash2, Shield } from 'lucide-react';
import { Unit } from '../hooks/useGrid';

interface SidebarProps {
  user: any | null;
  selectedUnitIds: number[];
  setSelectedUnitIds: (ids: number[]) => void;
  selectedUnits: Unit[];
  totalPrice: number;
  isOwner: boolean;
  pendingImage: string | null;
  setPendingImage: (img: string | null) => void;
  pendingLink: string;
  setPendingLink: (link: string) => void;
  resalePrice: number;
  setResalePrice: (price: number) => void;
  isForSale: boolean;
  setIsForSale: (val: boolean) => void;
  canBuy: boolean;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpdatePrice: () => Promise<void>;
  handleBuy: () => Promise<void>;
  isUpdatingPrice: boolean;
  isBuying: boolean;
  onLoginClick: () => void;
  settings: any | null;
  handleModerateUnit?: (ids: number[]) => Promise<void>;
  handleResetUnits?: (ids: number[]) => Promise<void>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  selectedUnitIds,
  setSelectedUnitIds,
  selectedUnits,
  totalPrice,
  isOwner,
  pendingImage,
  setPendingImage,
  pendingLink,
  setPendingLink,
  resalePrice,
  setResalePrice,
  isForSale,
  setIsForSale,
  canBuy,
  handleImageUpload,
  handleUpdatePrice,
  handleBuy,
  isUpdatingPrice,
  isBuying,
  onLoginClick,
  settings,
  handleModerateUnit,
  handleResetUnits,
}) => {

  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (selectedUnitIds.length === 1) {
      fetch(`/api/unit/${selectedUnitIds[0]}/history`)
        .then(res => res.json())
        .then(data => setHistory(data))
        .catch(() => setHistory([]));
    } else {
      setHistory([]);
    }
  }, [selectedUnitIds]);

  return (
    <AnimatePresence>
      {selectedUnitIds.length > 0 && (
        <motion.div
          initial={window.innerWidth < 640 ? { y: '100%', x: 0 } : { x: '100%', y: 0 }}
          animate={{ x: 0, y: 0 }}
          exit={window.innerWidth < 640 ? { y: '100%', x: 0 } : { x: '100%', y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute z-40 bg-[#0A0A0A] flex flex-col p-6 bottom-0 left-0 w-full h-[85vh] border-t border-[#262626] rounded-t-[32px] sm:top-0 sm:right-0 sm:left-auto sm:w-[400px] sm:h-full sm:border-t-0 sm:border-l sm:rounded-t-none"
        >
          {/* Кнопка закрытия */}
          <button 
            onClick={() => setSelectedUnitIds([])}
            className="absolute top-6 right-6 p-2 hover:bg-[#141414] transition-colors"
          >
            <X size={20} />
          </button>

          {/* Заголовок секции */}
          <div className="mt-12">
            <span className="text-[11px] uppercase tracking-[0.3em] text-[#FF5733] font-bold">Selection Details</span>
            <h2 className="text-5xl font-bold tracking-tighter mt-2">
              {selectedUnitIds.length === 1 ? `#${selectedUnitIds[0]}` : `${selectedUnitIds.length} Units`}
            </h2>
            
            {selectedUnitIds.length === 1 && selectedUnits[0]?.metadata?.link && (
              <button 
                onClick={() => window.open(selectedUnits[0].metadata.link, '_blank')}
                className="mt-4 w-full bg-[#141414] border border-[#262626] py-3 px-4 flex items-center justify-between group hover:border-[#FF5733] transition-colors"
              >
                <div className="flex flex-col items-start">
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">External Link</span>
                  <span className="text-xs font-bold text-[#FF5733] truncate max-w-[200px]">
                    {selectedUnits[0].metadata.link.replace(/^https?:\/\//, '')}
                  </span>
                </div>
                <ExternalLink size={14} className="text-gray-500 group-hover:text-[#FF5733] transition-colors" />
              </button>
            )}
          </div>

          {/* Основной контент */}
          <div className="mt-8 space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <section>
              <h3 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">
                {isOwner ? 'Update Image & Link' : 'Upload Image & Link'}
              </h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-4">
                  <label className="w-20 h-20 bg-[#141414] border border-[#262626] flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer hover:border-[#FF5733] transition-colors shrink-0">
                    {pendingImage ? (
                      <>
                        <img src={pendingImage} alt="Pending" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload size={16} className="text-white" />
                        </div>
                      </>
                    ) : selectedUnitIds.length === 1 && selectedUnits[0]?.metadata?.image_url ? (
                      <img src={selectedUnits[0].metadata.image_url} alt="Unit" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon size={18} className="text-gray-700 group-hover:text-[#FF5733]" />
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  <div className="flex-1">
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Image Settings</p>
                    <p className="text-[8px] text-gray-600 mt-1 uppercase">Square format recommended</p>
                  </div>
                </div>
                
                <div className="space-y-1 mt-2">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Destination Link</label>
                  <input 
                    type="url" 
                    placeholder="https://example.com"
                    value={pendingLink}
                    onChange={(e) => setPendingLink(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] px-3 py-1.5 text-xs focus:outline-none focus:border-[#FF5733]"
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Market Data</h3>
              <div className="bg-[#141414] p-3 border border-[#262626] flex justify-between items-center mb-2">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#FF5733] font-bold">Total Price</div>
                  <div className="text-xl font-bold mt-0.5">{totalPrice.toFixed(2)} UNIT</div>
                </div>
              </div>

              {(isOwner || (!isOwner && canBuy && user)) && (
                <>
                  <div className="space-y-1 mt-4">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Set Resale Price</label>
                    <input 
                      type="number" step="0.1"
                      min={((totalPrice / selectedUnitIds.length) * 1.2).toFixed(2)}
                      max={(totalPrice / selectedUnitIds.length * 2).toFixed(2)}
                      value={resalePrice}
                      onChange={(e) => setResalePrice(Number(e.target.value))}
                      className="w-full bg-[#141414] border border-[#262626] px-3 py-1.5 text-xs focus:outline-none focus:border-[#FF5733]"
                    />
                  </div>

                  <div className="space-y-2 mt-4 pt-4 border-t border-[#262626]">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Market Status</label>
                    <button
                      onClick={() => setIsForSale(!isForSale)}
                      className={`w-full py-3 px-4 border text-xs font-bold uppercase tracking-widest transition-colors flex justify-between items-center ${
                        isForSale
                          ? 'bg-[#FF5733]/10 border-[#FF5733] text-[#FF5733]'
                          : 'bg-[#141414] border-[#262626] text-gray-500 hover:border-gray-600'
                      }`}
                    >
                      <span>{isForSale ? 'Open for Offers' : 'Locked (Private)'}</span>
                      <div className={`w-8 h-4 border ${isForSale ? 'border-[#FF5733] bg-[#FF5733]' : 'border-gray-500 bg-transparent'} relative transition-colors`}>
                        <div className={`absolute top-0 bottom-0 w-3.5 bg-white transition-all ${isForSale ? 'right-0' : 'left-0'}`} />
                      </div>
                    </button>
                    <p className="text-[8px] text-gray-600 uppercase tracking-widest mt-1 font-medium">
                      {isForSale ? "Other users can buy these pixels." : "These pixels are locked and cannot be purchased."}
                    </p>
                  </div>
                </>
              )}
            </section>

            {/* --- НОВОЕ: ИСТОРИЯ ВЛАДЕНИЯ (PROVENANCE) --- */}
            {selectedUnitIds.length === 1 && history.length > 0 && (
              <section className="mt-6">
                <h3 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">Ownership History</h3>
                <div className="space-y-3 bg-[#141414] border border-[#262626] p-4 rounded-xl max-h-48 overflow-y-auto custom-scrollbar">
                  {history.map((entry, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <div className="flex flex-col">
                        <span className="text-white font-bold uppercase tracking-tight">Bought by {entry.buyer_name}</span>
                        <span className="text-gray-500 text-[8px]">{new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className="text-[#FF5733] font-bold">{entry.price.toFixed(2)} UNIT</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* --- ПАНЕЛЬ АДМИНА (GOD MODE) --- */}
            {user?.is_admin && selectedUnits.some(u => u.owner_id) && (
              <section className="mt-8 pt-6 border-t border-red-500/20">
                <h3 className="text-[10px] uppercase tracking-widest text-red-500 font-bold mb-3 flex items-center gap-2">
                  <Shield size={12} /> Admin Override
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleModerateUnit && handleModerateUnit(selectedUnitIds)}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 py-3 px-4 text-[10px] uppercase font-bold tracking-widest transition-colors flex items-center justify-between"
                  >
                    <span>Clear Image & Link</span>
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => handleResetUnits && handleResetUnits(selectedUnitIds)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 text-[10px] uppercase font-bold tracking-widest transition-colors flex items-center justify-between shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                  >
                    <span>Confiscate (Reset Unit)</span>
                    <Lock size={14} />
                  </button>
                  <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-2 leading-relaxed">
                    Clear removes content but keeps the owner. Confiscate removes the owner and sets price to default.
                  </p>
                </div>
              </section>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="mt-auto pt-8">
            {!user ? (
              <button
                onClick={onLoginClick}
                className="w-full bg-[#FF5733] text-white py-6 font-bold uppercase tracking-[0.2em] text-sm hover:bg-[#E64A19] transition-colors flex items-center justify-center gap-3"
              >
                <LogIn size={18} /> Login to Purchase
              </button>
            ) : isOwner ? (
              <button
                onClick={handleUpdatePrice}
                disabled={isUpdatingPrice}
                className="w-full bg-white text-black py-6 font-bold uppercase tracking-[0.2em] text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isUpdatingPrice ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : 'Update Status & Details'}
              </button>
            ) : !canBuy ? (
              <button
                disabled
                className="w-full bg-[#141414] border border-[#262626] text-gray-500 py-6 font-bold uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 cursor-not-allowed"
              >
                <Lock size={18} /> Not For Sale
              </button>
            ) : (
              <button
                onClick={handleBuy}
                disabled={isBuying || !pendingImage}
                className="w-full bg-[#FF5733] text-white py-6 font-bold uppercase tracking-[0.2em] text-sm hover:bg-[#E64A19] transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isBuying ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ShoppingCart size={18} /> {settings?.ui_buy_button || 'Buy Units'}</>}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};