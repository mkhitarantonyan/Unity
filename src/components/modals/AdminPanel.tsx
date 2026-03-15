import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BarChart3, Users, BoxSelect, Settings as SettingsIcon, Lock, Unlock, Trash2, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { getToken } from '../../utils/auth';

interface AppSettings {
  ui_title: string;
  ui_subtitle: string;
  ui_buy_button: string;
  ui_loading: string;
  cloudinary_cloud_name: string;
  cloudinary_api_key: string;
  cloudinary_api_secret: string;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  setGlobalSettings: (settings: AppSettings) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, user, setGlobalSettings }) => {
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminSettings, setAdminSettings] = useState<AppSettings | null>(null);

  // Jackpot States
  const [secretPixelId, setSecretPixelId] = useState('');
  const [isPrizeActive, setIsPrizeActive] = useState(false);
  const [isTogglingPrize, setIsTogglingPrize] = useState(false);

  const fetchAdminData = async () => {
    if (!user?.is_admin) return;
    const token = getToken();
    const headers = { 
      'x-admin-id': user.id,
      'Authorization': `Bearer ${token}` 
    };
    
    try {
      const [statsRes, usersRes, settingsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/settings', { headers })
      ]);

      if (statsRes.ok) setAdminStats(await statsRes.json());
      if (usersRes.ok) setAdminUsers(await usersRes.json());
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setAdminSettings(settings);
        // Загружаем текущее состояние джекпота из настроек
        setSecretPixelId(settings.secret_pixel_id || '');
        setIsPrizeActive(settings.is_prize_active === 'true');
      }
    } catch (err) {
      console.error('Admin data fetch error:', err);
    }
  };

  useEffect(() => {
    if (isOpen) fetchAdminData();
  }, [isOpen]);

  const handleTogglePrize = async () => {
    const token = getToken();
    setIsTogglingPrize(true);
    try {
      const res = await fetch('/api/admin/toggle-prize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ pixelId: Number(secretPixelId), active: !isPrizeActive })
      });
      if (res.ok) {
        setIsPrizeActive(!isPrizeActive);
        toast.success(!isPrizeActive ? 'Jackpot Activated!' : 'Jackpot Deactivated');
      }
    } catch (e) {
      toast.error('Failed to update Jackpot');
    } finally {
      setIsTogglingPrize(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === user.id) return toast.error("You can't delete yourself");
    if (!window.confirm('PERMANENTLY delete user and reset their units?')) return;

    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}` 
        },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        toast.success('User deleted');
        fetchAdminData();
      }
    } catch (e) {
      toast.error('Delete failed');
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
          className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-8 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Admin Control</h2>
              <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">Manage grid, users, and jackpot</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-500 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
            
            {/* 1. JACKPOT CONTROL (Новое!) */}
            <div className="bg-[#FF5733]/5 border border-[#FF5733]/20 p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-[#FF5733] text-sm font-bold uppercase tracking-widest">
                <Coins className="w-4 h-4" /> Jackpot Configuration
              </div>
              <div className="flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-gray-500 text-[10px] uppercase tracking-widest">Winning Pixel ID</label>
                  <input 
                    type="number" value={secretPixelId}
                    onChange={(e) => setSecretPixelId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#FF5733]"
                    placeholder="e.g. 4532"
                  />
                </div>
                <button 
                  onClick={handleTogglePrize}
                  disabled={isTogglingPrize || !secretPixelId}
                  className={`px-8 py-3 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all ${isPrizeActive ? 'bg-green-600 text-white' : 'bg-[#FF5733] text-white'} disabled:opacity-50`}
                >
                  {isTogglingPrize ? 'Wait...' : isPrizeActive ? 'Deactivate Jackpot' : 'Activate Jackpot'}
                </button>
              </div>
            </div>

            {/* 2. STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 text-center sm:text-left">
                <BarChart3 className="w-8 h-8 text-[#FF5733] mb-4 mx-auto sm:mx-0" />
                <div className="text-2xl font-bold text-white">${adminStats?.revenue?.toFixed(2) || '0.00'}</div>
                <div className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Total Revenue</div>
              </div>
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 text-center sm:text-left">
                <Users className="w-8 h-8 text-blue-500 mb-4 mx-auto sm:mx-0" />
                <div className="text-2xl font-bold text-white">{adminStats?.users || 0}</div>
                <div className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Total Users</div>
              </div>
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 text-center sm:text-left">
                <BoxSelect className="w-8 h-8 text-emerald-500 mb-4 mx-auto sm:mx-0" />
                <div className="text-2xl font-bold text-white">{adminStats?.ownedUnits || 0}</div>
                <div className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Owned Units</div>
              </div>
            </div>

            {/* 3. SETTINGS */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-white text-sm font-bold uppercase tracking-widest">
                <SettingsIcon className="w-4 h-4" /> Global Settings
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {adminSettings && Object.entries(adminSettings).map(([key, value]) => (
                  key !== 'secret_pixel_id' && key !== 'is_prize_active' && (
                    <div key={key} className="space-y-2">
                      <label className="text-gray-500 text-[10px] uppercase tracking-widest">{key.replace(/_/g, ' ')}</label>
                      <input 
                        type="text" value={value as string}
                        onChange={(e) => setAdminSettings({ ...adminSettings, [key]: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF5733] outline-none"
                      />
                    </div>
                  )
                ))}
              </div>
              <button 
                onClick={async () => {
                  const res = await fetch('/api/admin/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                    body: JSON.stringify(adminSettings)
                  });
                  if (res.ok) toast.success('Settings updated');
                }}
                className="bg-[#FF5733] text-white px-8 py-3 rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-white hover:text-black transition-colors"
              >
                Save Global Settings
              </button>
            </div>

            {/* 4. USER MANAGEMENT */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-white text-sm font-bold uppercase tracking-widest">
                <Users className="w-4 h-4" /> User Management
              </div>
              <div className="bg-white/5 rounded-2xl border border-white/5 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-6 py-4 text-gray-500 text-[10px] uppercase tracking-widest">User</th>
                      <th className="px-6 py-4 text-gray-500 text-[10px] uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-gray-500 text-[10px] uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {adminUsers.map(u => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-white text-sm font-medium">{u.first_name}</div>
                          <div className="text-gray-500 text-xs">@{u.username}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] uppercase font-bold ${u.is_blocked ? 'text-red-500' : 'text-emerald-500'}`}>
                            {u.is_blocked ? 'Blocked' : 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <button 
                            onClick={() => {
                              fetch('/api/admin/block-user', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                                body: JSON.stringify({ userId: u.id, block: !u.is_blocked })
                              }).then(() => fetchAdminData());
                            }}
                            className={`p-2 rounded-lg ${u.is_blocked ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-yellow-500 hover:bg-yellow-500/10'}`}
                          >
                            {u.is_blocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};