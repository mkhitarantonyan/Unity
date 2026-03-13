import React from 'react';
import { Search, Heart, Shield, LogOut } from 'lucide-react';

interface HeaderProps {
  settings: any;
  user: any;
  myUnitsCount: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: (e: React.FormEvent) => void;
  setShowProfileModal: (show: boolean) => void;
  setShowAdminPanel: (show: boolean) => void;
  setAuthMode: (mode: 'login' | 'register') => void;
  setShowAuthModal: (show: boolean) => void;
  handleLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  user,
  myUnitsCount,
  searchQuery,
  setSearchQuery,
  handleSearch,
  setShowProfileModal,
  setShowAdminPanel,
  setAuthMode,
  setShowAuthModal,
  handleLogout
}) => {
  return (
    <header className="absolute top-0 left-0 w-full p-4 sm:p-6 z-20 flex justify-between items-start pointer-events-none">
{/* ЛЕВАЯ ЧАСТЬ: Брендинг, Благотворительность и Контакты */}
      <div className="pointer-events-auto flex flex-col items-start">
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tighter leading-none">
          {settings?.ui_title || 'UNITY'}
        </h1>
        <p className="text-[8px] sm:text-xs uppercase tracking-[0.2em] text-[#FF5733] mt-1 font-bold">
          {settings?.ui_subtitle || 'The Collective Canvas'}
        </p>
        
        {/* Блок с бейджами */}
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="inline-flex items-center gap-2 bg-[#141414]/80 backdrop-blur-md border border-[#262626] px-3 py-1.5 shadow-lg">
            <Heart size={12} className="text-[#FF5733] fill-[#FF5733]" />
            <span className="text-[8px] uppercase tracking-[0.1em] text-gray-400 font-bold">
              10% of transactions go to charity
            </span>
          </div>
        </div>
      </div>
      
      {/* ПРАВАЯ ЧАСТЬ: Поиск и Профиль */}
      <div className="pointer-events-auto flex flex-col sm:flex-row items-end sm:items-center gap-4 sm:gap-6 mt-1">
        <form onSubmit={handleSearch} className="hidden sm:flex relative group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#FF5733] transition-colors" />
          <input 
            type="text" 
            placeholder="Search ID or @username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#141414]/80 backdrop-blur-md border border-[#262626] pl-9 pr-4 text-[10px] uppercase tracking-widest font-bold focus:outline-none focus:border-[#FF5733] w-64 text-white transition-colors h-10"
          />
        </form>

        {user ? (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowProfileModal(true)}
              className="bg-[#141414]/80 hover:bg-[#262626] backdrop-blur-md border border-[#262626] px-4 text-[10px] uppercase tracking-widest font-bold transition-colors flex items-center gap-2 h-10"
            >
              <span>{user.first_name}</span>
              <span className="text-[#FF5733] ml-2 border-l border-[#262626] pl-2">{myUnitsCount} Units</span>
            </button>
            
            {user.is_admin && (
              <button 
                onClick={() => setShowAdminPanel(true)}
                className="bg-[#FF5733] hover:bg-[#E64A19] transition-colors h-10 w-10 flex items-center justify-center"
                title="Admin Panel"
              >
                <Shield size={14} />
              </button>
            )}

            <button 
              onClick={handleLogout}
              className="bg-[#262626] hover:bg-[#FF5733] transition-colors text-white h-10 w-10 flex items-center justify-center"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
            className="bg-[#FF5733] text-white px-6 h-10 text-[8px] sm:text-[10px] uppercase tracking-widest font-bold flex items-center justify-center"
          >
            Login
          </button>
        )}
      </div>
    </header>
  );
};