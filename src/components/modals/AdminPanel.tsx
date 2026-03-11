import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BarChart3, Users, BoxSelect, Settings as SettingsIcon, Lock, Unlock } from 'lucide-react';
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
        fetch('/api/admin/settings')
      ]);

      if (statsRes.ok) setAdminStats(await statsRes.json());
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setAdminUsers(Array.isArray(usersData) ? usersData : []);
      } else {
        setAdminUsers([]);
        toast.error('Failed to load users');
      }
      
      if (settingsRes.ok) setAdminSettings(await settingsRes.json());
    } catch (err) {
      console.error('Admin data fetch error:', err);
      setAdminUsers([]);
    }
  };

  useEffect(() => {
    if (isOpen) fetchAdminData();
  }, [isOpen]);

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
          <div className="p-8 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Admin Control</h2>
              <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">Manage grid, users, and settings</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-500 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                <BarChart3 className="w-8 h-8 text-[#FF5733] mb-4" />
                <div className="text-2xl font-bold text-white">${adminStats?.revenue?.toFixed(2) || '0.00'}</div>
                <div className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Total Revenue</div>
              </div>
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                <Users className="w-8 h-8 text-blue-500 mb-4" />
                <div className="text-2xl font-bold text-white">{adminStats?.users || 0}</div>
                <div className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Total Users</div>
              </div>
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                <BoxSelect className="w-8 h-8 text-emerald-500 mb-4" />
                <div className="text-2xl font-bold text-white">{adminStats?.ownedUnits || 0}</div>
                <div className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Owned Units</div>
              </div>
            </div>

            {/* Настройки */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-white text-sm font-bold uppercase tracking-widest">
                <SettingsIcon className="w-4 h-4" /> Global Settings
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {adminSettings && Object.entries(adminSettings).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <label className="text-gray-500 text-[10px] uppercase tracking-widest">{key.replace(/_/g, ' ')}</label>
                    <input 
                      type="text"
                      value={value as string}
                      onChange={(e) => setAdminSettings({ ...adminSettings, [key]: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF5733] transition-colors"
                    />
                  </div>
                ))}
              </div>
              <button 
                onClick={async () => {
                  if (!adminSettings) return;
                  const res = await fetch('/api/admin/settings', {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'x-admin-id': user?.id || '',
                      'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify(adminSettings)
                  });
                  if (res.ok) {
                    toast.success('Settings updated');
                    setGlobalSettings(adminSettings);
                  }
                }}
                className="bg-[#FF5733] text-white px-8 py-3 rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-[#FF5733]/80 transition-colors"
              >
                Save Settings
              </button>
            </div>

            {/* Пользователи */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-white text-sm font-bold uppercase tracking-widest">
                <Users className="w-4 h-4" /> User Management
              </div>
              <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
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
                          {u.is_blocked ? (
                            <span className="text-red-500 text-[10px] uppercase font-bold">Blocked</span>
                          ) : (
                            <span className="text-emerald-500 text-[10px] uppercase font-bold">Active</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={async () => {
                              await fetch('/api/admin/block-user', {
                                method: 'POST',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  'x-admin-id': user?.id || '',
                                  'Authorization': `Bearer ${getToken()}`
                                },
                                body: JSON.stringify({ userId: u.id, block: !u.is_blocked })
                              });
                              fetchAdminData();
                            }}
                            className={`p-2 rounded-lg transition-colors ${u.is_blocked ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-red-500 hover:bg-red-500/10'}`}
                          >
                            {u.is_blocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
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