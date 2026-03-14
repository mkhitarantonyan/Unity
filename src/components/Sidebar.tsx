import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, ExternalLink, X, Upload, Image as ImageIcon, LogIn, Lock, Trash2, Shield, ChevronLeft } from 'lucide-react';
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
  isMobile: boolean;
  onCloseMobile: () => void;
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
  isMobile,
  onCloseMobile,
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
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-full z-[100] bg-[#0A0A0A] flex flex-col p-6 w-[85%] sm:w-[400px] border-l border-[#262626] shadow-2xl overflow-hidden"
        >
          {/* КНОПКА ЗАКРЫТИЯ / НАЗАД */}
          {isMobile ? (
            <button 
              onClick={onCloseMobile}
              className="flex items-center gap-2 text-gray-500 hover:text-[#FF5733] transition-colors mb-4 group"
            >
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Back to Grid</span>
            </button>
          ) : (
            <button 
              onClick={() => setSelectedUnitIds([])}
              // Опустили крестик ниже (top-28), чтобы кнопки хедера его не перекрывали
              className="absolute top-28 right-6 p-2 hover:bg-[#141414] transition-colors text-gray-500 hover:text-white"
            >
              <X size={20} />
            </button>
          )}

          {/* Заголовок: опустили ниже на десктопе, чтобы не конфликтовать с кнопками профиля */}
          <div className={`${isMobile ? 'mt-2' : 'mt-24'}`}>
            <span className="text-[11px] uppercase tracking-[0.3em] text-[#FF5733] font-bold">Selection Details</span>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tighter mt-2 text-white">
              {selectedUnitIds.length === 1 ? `#${selectedUnitIds}` : `${selectedUnitIds.length} Units`}
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

          {/* Основной контент (Прокручиваемый) */}
          <div className="mt-8 space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <section>
              <h3 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">
                {isOwner ? 'Update Image & Link' : 'Upload Image & Link'}
              </h3>
              <div className="flex flex-col gap-4">
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
                
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Destination Link</label>
                  <input 
                    type="url" 
                    placeholder="https://example.com"
                    value={pendingLink}
                    onChange={(e) => setPendingLink(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] px-3 py-2 text-xs focus:outline-none focus:border-[#FF5733] text-white"
                  />
                </div>
              </div>
            </section>

            <section className="bg-[#141414]/50 p-4 border border-[#262626]">
              <h3 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">Market Data</h3>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Total Price</div>
                  <div className="text-2xl font-bold text-white mt-1">{totalPrice.toFixed(2)} USD</div>
                </div>
              </div>

              {(isOwner || (!isOwner && canBuy && user)) && (
                <div className="mt-6 pt-4 border-t border-white/5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Set Resale Price</label>
                    <input 
                      type="number" step="0.1"
                      min={((totalPrice / selectedUnitIds.length) * 1.2).toFixed(2)}
                      value={resalePrice}
                      onChange={(e) => setResalePrice(Number(e.target.value))}
                      className="w-full bg-[#0A0A0A] border border-[#262626] px-3 py-2 text-xs focus:outline-none focus:border-[#FF5733] text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Market Status</label>
                    <button
                      onClick={() => setIsForSale(!isForSale)}
                      className={`w-full py-3 px-4 border text-[10px] font-bold uppercase tracking-widest transition-colors flex justify-between items-center ${
                        isForSale
                          ? 'bg-[#FF5733]/10 border-[#FF5733] text-[#FF5733]'
                          : 'bg-[#0A0A0A] border-[#262626] text-gray-500 hover:border-gray-600'
                      }`}
                    >
                      <span>{isForSale ? 'Open for Offers' : 'Locked (Private)'}</span>
                      <div className={`w-8 h-4 border ${isForSale ? 'border-[#FF5733] bg-[#FF5733]' : 'border-gray-500 bg-transparent'} relative transition-colors`}>
                        <div className={`absolute top-0 bottom-0 w-3.5 bg-white transition-all ${isForSale ? 'right-0' : 'left-0'}`} />
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* ИСТОРИЯ */}
            {selectedUnitIds.length === 1 && history.length > 0 && (
              <section>
                <h3 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">Provenance</h3>
                <div className="space-y-2">
                  {history.map((entry, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[9px] bg-[#141414] border border-[#262626] p-2">
                      <div className="flex flex-col">
                        <span className="text-white font-bold uppercase tracking-tight">@{entry.buyer_name}</span>
                        <span className="text-gray-600">{new Date(entry.timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="text-[#FF5733] font-bold">{entry.price.toFixed(2)} USD</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ADMIN MODE */}
            {user?.is_admin && selectedUnits.some(u => u.owner_id) && (
              <section className="mt-4 p-4 border border-red-500/20 bg-red-500/5">
                <h3 className="text-[10px] uppercase tracking-widest text-red-500 font-bold mb-3 flex items-center gap-2">
                  <Shield size={12} /> God Mode
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleModerateUnit && handleModerateUnit(selectedUnitIds)}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 py-2 text-[9px] uppercase font-bold tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    Clear Content <Trash2 size={12} />
                  </button>
                  <button
                    onClick={() => handleResetUnits && handleResetUnits(selectedUnitIds)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 text-[9px] uppercase font-bold tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    Confiscate <Lock size={12} />
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* КНОПКИ ДЕЙСТВИЙ */}
          <div className={`pt-6 ${isMobile ? 'pb-8' : 'pb-4'}`}>
            {!user ? (
              <button
                onClick={onLoginClick}
                className="w-full bg-[#FF5733] text-white py-5 font-bold uppercase tracking-[0.2em] text-xs hover:bg-[#E64A19] transition-colors flex items-center justify-center gap-3 shadow-lg"
              >
                <LogIn size={16} /> Login to Purchase
              </button>
            ) : isOwner ? (
              <button
                onClick={handleUpdatePrice}
                disabled={isUpdatingPrice}
                className="w-full bg-white text-black py-5 font-bold uppercase tracking-[0.2em] text-xs hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg"
              >
                {isUpdatingPrice ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : 'Update Pixels'}
              </button>
            ) : !canBuy ? (
              <button
                disabled
                className="w-full bg-[#141414] border border-[#262626] text-gray-500 py-5 font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 cursor-not-allowed"
              >
                <Lock size={16} /> Not For Sale
              </button>
            ) : (
              <button
                onClick={handleBuy}
                disabled={isBuying || !pendingImage}
                className="w-full bg-[#FF5733] text-white py-5 font-bold uppercase tracking-[0.2em] text-xs hover:bg-[#E64A19] transition-colors disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg"
              >
                {isBuying ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ShoppingCart size={16} /> 
                    {settings?.ui_buy_button || 'Buy Units'}
                  </>
                )}
              </button>
            )}
            {!isOwner && canBuy && !pendingImage && user && (
               <p className="text-[8px] text-gray-500 text-center uppercase mt-3 tracking-widest animate-pulse">
                  Upload an image to unlock checkout
               </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};