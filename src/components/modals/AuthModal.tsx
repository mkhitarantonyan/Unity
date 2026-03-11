import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode: 'login' | 'register';
  onSuccess: (user: any) => void;
  // Новый проп для открытия правил
  onOpenLegal: (type: 'terms' | 'privacy' | 'refund') => void; 
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode, onSuccess, onOpenLegal }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  
  // Стейт для нашей новой галочки
  const [agreed, setAgreed] = useState(false); 

  useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode, isOpen]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, firstName })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('unity_user', JSON.stringify(data));
        onSuccess(data);
        onClose();
        toast.success(authMode === 'login' ? 'Logged in' : 'Registered successfully');
      } else {
        toast.error(data.error || 'Auth failed');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setIsAuthLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          className="bg-[#0A0A0A] border border-[#262626] p-8 w-full max-w-md relative"
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
            <X size={20} />
          </button>
          
          <div className="mb-8">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#FF5733] font-bold">Account</span>
            <h2 className="text-3xl font-bold tracking-tighter mt-2">
              {authMode === 'login' ? 'Welcome Back' : 'Join Unity'}
            </h2>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">First Name</label>
                <input 
                  type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] px-4 py-3 text-sm focus:outline-none focus:border-[#FF5733] transition-colors text-white"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Username</label>
              <input 
                type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#141414] border border-[#262626] px-4 py-3 text-sm focus:outline-none focus:border-[#FF5733] transition-colors text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Password</label>
              <input 
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#141414] border border-[#262626] px-4 py-3 text-sm focus:outline-none focus:border-[#FF5733] transition-colors text-white"
              />
            </div>

            {/* НОВАЯ ГАЛОЧКА ТОЛЬКО ДЛЯ РЕГИСТРАЦИИ */}
            {authMode === 'register' && (
              <div className="flex items-start gap-3 mt-4 bg-[#141414]/50 p-3 border border-[#262626]">
                <input 
                  type="checkbox" 
                  id="agree"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 accent-[#FF5733] bg-[#141414] border-[#262626] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="agree" className="text-[10px] text-gray-400 leading-relaxed uppercase tracking-wider">
                  I agree to the{' '}
                  <button type="button" onClick={() => onOpenLegal('terms')} className="text-[#FF5733] font-bold hover:underline">Terms</button>,{' '}
                  <button type="button" onClick={() => onOpenLegal('privacy')} className="text-[#FF5733] font-bold hover:underline">Privacy</button>, &{' '}
                  <button type="button" onClick={() => onOpenLegal('refund')} className="text-[#FF5733] font-bold hover:underline">Refund Policy</button>.
                </label>
              </div>
            )}

            {/* Кнопка отключена, если это регистрация и галочка не стоит */}
            <button 
              type="submit"
              disabled={isAuthLoading || (authMode === 'register' && !agreed)}
              className="w-full bg-white text-black py-4 font-bold uppercase tracking-[0.2em] text-xs hover:bg-gray-200 transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                authMode === 'login' ? 'Login' : 'Register'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-[#FF5733] transition-colors font-bold"
            >
              {authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};