import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BoxSelect, Image as ImageIcon, Wallet, ArrowRight } from 'lucide-react';
import { Unit } from '../../hooks/useGrid';
import { getToken } from '../../utils/auth';
import { toast } from 'sonner';

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
  const [balance, setBalance] = useState<number>(0);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const token = getToken();
      if (token) {
        fetch('/api/user/balance', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => setBalance(data.balance || 0))
        .catch(() => setBalance(0));
      }
    }
  }, [isOpen]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (Number(withdrawAmount) > balance) {
      toast.error('Insufficient balance');
      return;
    }
    if (!walletAddress.trim()) {
      toast.error('Enter a valid wallet address');
      return;
    }

    setIsWithdrawing(true);
    try {
      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          amount: Number(withdrawAmount),
          walletAddress: walletAddress.trim()
        })
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Заявка отправлена. Ожидайте поступления средств.');
        setBalance(data.balance);
        setWithdrawAmount('');
        setWalletAddress('');
      } else {
        toast.error(data.error || 'Failed to request withdrawal');
      }
    } catch (err) {
      toast.error('Network error during withdrawal');
    } finally {
      setIsWithdrawing(false);
    }
  };

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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-[#141414] p-6 rounded-2xl border border-[#262626]">
                <div className="text-3xl font-bold text-white">{myUnits.length}</div>
                <div className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Owned Units</div>
              </div>
              <div className="bg-[#141414] p-6 rounded-2xl border border-[#262626]">
                <div className="text-3xl font-bold text-[#FF5733]">{myTotalValue.toFixed(2)}</div>
                <div className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Total Value (USD)</div>
              </div>
              <div className="bg-[#141414] p-6 rounded-2xl border border-[#262626] col-span-2 sm:col-span-1">
                <div className="text-3xl font-bold text-emerald-500">{balance.toFixed(2)}</div>
                <div className="text-gray-500 text-[10px] uppercase tracking-widest mt-1 flex items-center gap-1">
                  <Wallet size={12} /> Balance (USDT)
                </div>
              </div>
            </div>

            <div className="bg-[#141414] p-6 rounded-2xl border border-[#262626]">
              <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-4">Withdraw Funds (BEP-20)</div>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Amount (USDT)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0.01" 
                        max={balance}
                        value={withdrawAmount} 
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#0A0A0A] border border-[#262626] px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-white"
                        disabled={isWithdrawing || balance <= 0}
                      />
                      <button 
                        type="button"
                        onClick={() => setWithdrawAmount(balance.toString())}
                        disabled={isWithdrawing || balance <= 0}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-emerald-500 hover:text-emerald-400"
                      >
                        Max
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Wallet Address</label>
                    <input 
                      type="text" 
                      value={walletAddress} 
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-[#0A0A0A] border border-[#262626] px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-white"
                      disabled={isWithdrawing || balance <= 0}
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={isWithdrawing || balance <= 0 || !withdrawAmount || !walletAddress}
                  className="w-full bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30 hover:border-emerald-500/50 border border-emerald-500/30 py-4 font-bold uppercase tracking-[0.2em] text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isWithdrawing ? (
                    <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                  ) : (
                    <>Request Withdrawal <ArrowRight size={16} /></>
                  )}
                </button>
              </form>
            </div>

            {myUnits.length > 0 ? (
              <>
                <button 
                  onClick={() => {
                    setSelectedUnitIds(myUnits.map(u => u.id));
                    setFocusUnitId(myUnits[0]?.id || null); // Исправлен фокус
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