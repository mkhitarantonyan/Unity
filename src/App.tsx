import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { UnityCanvas } from './components/UnityCanvas';
import { Sidebar } from './components/Sidebar';
import { Minimap } from './components/Minimap';
import { FloatingMenu } from './components/FloatingMenu';
import { CursorTooltip } from './components/CursorTooltip';
import { processImage } from './utils/image';
import { MousePointer2, BoxSelect, LogIn, LogOut, X, Shield, Users, Settings as SettingsIcon, BarChart3, Trash2, Lock, Unlock, Image as ImageIcon, Search, Heart } from 'lucide-react';
import { useGrid, Unit } from './hooks/useGrid';
import { getUser, getAuthData, initApp, logout, getToken } from './utils/auth';

interface AppSettings {
  ui_title: string;
  ui_subtitle: string;
  ui_buy_button: string;
  ui_loading: string;
  cloudinary_cloud_name: string;
  cloudinary_api_key: string;
  cloudinary_api_secret: string;
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  
  useEffect(() => {
    initApp();
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(setSettings);
  }, []);

  const { units, isLoading, error, refresh } = useGrid();
  const [user, setUser] = useState(() => getUser());
  const [showGuides, setShowGuides] = useState(false);
  const [forceShow, setForceShow] = useState(false);
  const [forceHideLoading, setForceHideLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setIsMobileSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setForceShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([]);
  const [hoveredUnit, setHoveredUnit] = useState<Unit | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<string>('');
  const [resalePrice, setResalePrice] = useState<number>(0);
  const [isForSale, setIsForSale] = useState<boolean>(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  const [activeMenu, setActiveMenu] = useState<{ unit: Unit, x: number, y: number } | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [focusUnitId, setFocusUnitId] = useState<number | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const viewportDataRef = useRef({ x: 0, y: 0, w: 100, h: 100 });

  const myUnits = units.filter(u => user && u.owner_id === user.id);
  const myTotalValue = myUnits.reduce((sum, u) => sum + u.sale_price, 0);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');

  const [showAdminPanel, setShowAdminPanel] = useState(false);
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
    if (showAdminPanel) fetchAdminData();
  }, [showAdminPanel]);

  const handleModerateUnit = async (unitIds: number[]) => {
    if (!user?.is_admin || unitIds.length === 0) return;
    if (!window.confirm('Are you sure you want to clear content for selected units?')) return;

    try {
      const res = await fetch('/api/admin/moderate-unit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-id': user.id,
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ unitIds })
      });
      if (res.ok) {
        toast.success('Content cleared successfully');
        refresh();
        setSelectedUnitIds([]); 
      } else {
        toast.error('Failed to clear content');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  const handleResetUnits = async (unitIds: number[]) => {
    if (!user?.is_admin || unitIds.length === 0) return;
    if (!window.confirm('CONFISCATE: Are you sure? This will remove the owner and reset the price.')) return;

    try {
      const res = await fetch('/api/admin/reset-unit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-id': user.id,
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ unitIds })
      });
      if (res.ok) {
        toast.success('Units confiscated and reset to default');
        refresh();
        setSelectedUnitIds([]);
      } else {
        toast.error('Failed to confiscate units');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  const selectedUnits = units.filter(u => selectedUnitIds.includes(u.id));
  const totalPrice = selectedUnits.reduce((sum, u) => sum + u.sale_price, 0);
  const isOwner = user && selectedUnitIds.length > 0 && selectedUnits.every(u => u.owner_id === user.id);
  const canBuy = selectedUnits.every(u => !u.owner_id || u.metadata.is_for_sale === true);

  useEffect(() => {
    if (selectedUnitIds.length === 0) {
      setPendingImage(null);
      setPendingLink('');
    } else {
      const avgPrice = selectedUnits.reduce((sum, u) => sum + u.sale_price, 0) / selectedUnitIds.length;
      setResalePrice(Number((avgPrice * 1.2).toFixed(2)));
      
      if (user && selectedUnitIds.length === 1 && selectedUnits.length === 1 && selectedUnits?.owner_id === user.id) {
        setPendingLink(selectedUnits.metadata.link || '');
        setIsForSale(!!selectedUnits.metadata.is_for_sale);
      } else {
        setIsForSale(false);
      }
    }
  }, [selectedUnitIds.length]); 

const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const promise = (async () => {
      const base64 = await processImage(file);
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64,
          initData: getAuthData()
        })
      });
      
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      return data.url;
    })();

    toast.promise(promise, {
      loading: 'Uploading to cloud...',
      success: (url) => {
        setPendingImage(url);
        return 'Image uploaded successfully';
      },
      error: 'Failed to upload image'
    });
  };

  const handleUnitClick = (unit: Unit, shiftKey: boolean, position?: { x: number, y: number }) => {
    if (shiftKey && selectedUnitIds.length > 0) {
      setActiveMenu(null);
      const anchor = units.find(u => u.id === selectedUnitIds);
      if (anchor) {
        const minX = Math.min(anchor.x, unit.x);
        const maxX = Math.max(anchor.x, unit.x);
        const minY = Math.min(anchor.y, unit.y);
        const maxY = Math.max(anchor.y, unit.y);
        
        const newSelection = units
          .filter(u => u.x >= minX && u.x <= maxX && u.y >= minY && u.y <= maxY)
          .map(u => u.id);
        
        setSelectedUnitIds(newSelection);
        return;
      }
    }

    if (isSelectionMode) {
      setActiveMenu(null);
      setSelectedUnitIds(prev => 
        prev.includes(unit.id) 
          ? prev.filter(id => id !== unit.id) 
          : [...prev, unit.id]
      );
      return;
    }

    if (unit.owner_id && position) {
      setActiveMenu({ unit, x: position.x, y: position.y });
      setSelectedUnitIds([unit.id]);
    } else {
      setActiveMenu(null);
      setSelectedUnitIds([unit.id]);
    }
  };

  const handleUpdatePrice = async () => {
    if (selectedUnitIds.length === 0 || !isOwner) return;
    setIsUpdatingPrice(true);
    
    const minX = Math.min(...selectedUnits.map(u => u.x));
    const minY = Math.min(...selectedUnits.map(u => u.y));
    const maxX = Math.max(...selectedUnits.map(u => u.x));
    const maxY = Math.max(...selectedUnits.map(u => u.y));

    try {
      const response = await fetch('/api/update-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitIds: selectedUnitIds,
          ownerId: user.id,
          nextSalePrice: resalePrice,
          initData: getAuthData(),
          metadata: pendingImage || pendingLink ? {
            title: `Owned by ${user.first_name}`,
            link: pendingLink,
            image_url: pendingImage || selectedUnits.metadata.image_url,
            is_for_sale: isForSale,
            group: selectedUnitIds.length > 1 ? { minX, minY, maxX, maxY } : undefined
          } : undefined
        })
      });

      if (response.ok) {
        await refresh();
        toast.success('Updated successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Update failed');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const handleBuy = async () => {
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    if (selectedUnitIds.length === 0 || !pendingImage) {
      toast.error('Please upload an image first');
      return;
    }
    setIsBuying(true);
    
    const minX = Math.min(...selectedUnits.map(u => u.x));
    const minY = Math.min(...selectedUnits.map(u => u.y));
    const maxX = Math.max(...selectedUnits.map(u => u.x));
    const maxY = Math.max(...selectedUnits.map(u => u.y));

    try {
      const response = await fetch('/api/buy-bulk-crypto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitIds: selectedUnitIds,
          ownerId: user.id,
          initData: getAuthData(),
          nextSalePrice: resalePrice,
          metadata: {
            title: `Owned by ${user.first_name}`,
            link: pendingLink,
            image_url: pendingImage,
            is_for_sale: isForSale,
            group: selectedUnitIds.length > 1 ? { minX, minY, maxX, maxY } : undefined
          }
        })
      });

      const data = await response.json();

      if (response.ok && data.paymentUrl) {
        toast.success('Redirecting to secure payment...');
        window.location.href = data.paymentUrl; 
      } else {
        toast.error(data.error || 'Transaction failed');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Network error');
    } finally {
      setIsBuying(false);
    }
  };

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
        setUser(data);
        setShowAuthModal(false);
        toast.success(authMode === 'login' ? 'Logged in' : 'Registered successfully');
        refresh();
      } else {
        toast.error(data.error || 'Auth failed');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('unity_user');
    setUser(null);
    toast.success('Logged out');
    window.location.reload();
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      
      if (data.unitIds.length === 0) {
        toast.error('Nothing found');
        return;
      }

      setSelectedUnitIds(data.unitIds);
      setFocusUnitId(data.unitIds); 
      
      if (data.unitIds.length > 1) {
        toast.success(`Found ${data.unitIds.length} units`);
      }
    } catch (err) {
      toast.error('Search failed');
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#0A0A0A] text-white selection:bg-[#FF5733] selection:text-white">
      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-4 sm:p-6 z-20 flex justify-between items-start pointer-events-none">
        
        {/* ЛЕВАЯ ЧАСТЬ: Брендинг и Благотворительность */}
        <div className="pointer-events-auto flex flex-col items-start">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tighter leading-none">
            {settings?.ui_title || 'UNITY'}
          </h1>
          <p className="text-[8px] sm:text-xs uppercase tracking-[0.2em] text-[#FF5733] mt-1 font-bold">
            {settings?.ui_subtitle || 'The Collective Canvas'}
          </p>
          
          <div className="mt-4 inline-flex items-center gap-2 bg-[#141414]/80 backdrop-blur-md border border-[#262626] px-3 py-1.5 shadow-lg">
            <Heart size={12} className="text-[#FF5733] fill-[#FF5733]" />
            <span className="text-[8px] uppercase tracking-[0.1em] text-gray-400 font-bold">
              10% of transactions go to charity
            </span>
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
                <span className="text-[#FF5733] ml-2 border-l border-[#262626] pl-2">{myUnits.length} Units</span>
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

      {/* НОВАЯ ПОДСКАЗКА ДЛЯ МОБИЛЬНЫХ */}
      <AnimatePresence>
        {isMobile && isSelectionMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-32 left-1/2 -translate-x-1/2 z-40 bg-[#FF5733] text-white px-5 py-2.5 rounded-full shadow-2xl pointer-events-none flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest font-bold whitespace-nowrap">
              Drag finger to select
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Canvas */}
      <div className="w-full h-full">
        <UnityCanvas 
          units={units} 
          selectedUnitIds={selectedUnitIds}
          pendingImage={pendingImage}
          isSelectionMode={isSelectionMode}
          focusUnitId={focusUnitId}
          showGuides={showGuides}
          viewportDataRef={viewportDataRef}
          onUnitClick={handleUnitClick} 
          onUnitHover={setHoveredUnit}
          onUnitsSelect={setSelectedUnitIds}
          onInteraction={() => setActiveMenu(null)}
        />
      </div>

      {/* Selection Mode & Guides Toolbar */}
      <div className={`fixed z-40 flex flex-col gap-2 transition-all duration-300 
        ${isMobile 
          ? 'top-1/2 -translate-y-1/2 right-4' 
          : 'bottom-8 left-8'                  
        }`}>
        
        {/* Кнопка Guides */}
        <button
          onClick={() => setShowGuides(!showGuides)}
          className={`flex items-center justify-center transition-all duration-300 border ${
            isMobile ? 'p-3' : 'px-4 py-3 gap-3'
          } ${
            showGuides 
              ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
              : 'bg-[#141414]/80 backdrop-blur-md border-[#262626] text-gray-400'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${showGuides ? 'bg-white animate-pulse' : 'bg-gray-600'} ${!isMobile && 'mr-1'}`} />
          {!isMobile && (
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold">
              Guides: {showGuides ? 'ON' : 'OFF'}
            </span>
          )}
        </button>

        {/* Кнопка Selection Mode */}
        <button
          onClick={() => setIsSelectionMode(!isSelectionMode)}
          className={`flex items-center justify-center transition-all duration-300 border ${
            isMobile ? 'p-3' : 'px-4 py-3 gap-3'
          } ${
            isSelectionMode 
              ? 'bg-[#FF5733] border-[#FF5733] text-white shadow-lg' 
              : 'bg-[#141414]/80 backdrop-blur-md border-[#262626] text-gray-400'
          }`}
        >
          {isSelectionMode ? <BoxSelect size={18} /> : <MousePointer2 size={18} />}
          {!isMobile && (
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold">
              Selection: {isSelectionMode ? 'ON' : 'OFF'}
            </span>
          )}
        </button>

        {isSelectionMode && !isMobile && (
          <p className="text-[8px] uppercase tracking-widest text-[#FF5733] font-bold animate-pulse text-center">
            Drag to select area
          </p>
        )}
      </div>

      {/* Hover Info */}
      <AnimatePresence>
        {hoveredUnit && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#141414] border border-[#262626] p-4 min-w-[200px] z-30 pointer-events-none"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Unit #{hoveredUnit.id}</span>
              <span className={`text-[10px] uppercase tracking-widest font-bold ${hoveredUnit.owner_id ? 'text-[#FF5733]' : 'text-emerald-500'}`}>
                {hoveredUnit.owner_id ? (hoveredUnit.metadata.is_for_sale ? 'For Sale' : 'Locked') : 'Available'}
              </span>
            </div>
            <div className="text-sm font-medium">
              {hoveredUnit.owner_id ? `Owner: ${hoveredUnit.owner_id}` : `Price: ${hoveredUnit.sale_price.toFixed(2)} UNIT`}
            </div>
            <div className="text-[10px] text-white mt-2 font-bold uppercase tracking-widest bg-white/5 p-1 text-center">
              Coordinates: X:{hoveredUnit.x} Y:{hoveredUnit.y}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* РАДАР: Полностью скрыт на мобилках, виден только на ПК */}
      {!isMobile && (
        <Minimap 
          units={units} 
          viewportDataRef={viewportDataRef} 
          onNavigate={(id) => setFocusUnitId(id)} 
          isSidebarOpen={selectedUnitIds.length > 0} 
        />
      )}

      {/* Floating Menu */}
      <FloatingMenu 
        activeMenu={activeMenu}
        onClose={() => setActiveMenu(null)}
      />

      {/* Сайдбар */}
      {selectedUnitIds.length > 0 && (!isMobile || isMobileSidebarOpen) && (
        <Sidebar 
          user={user}
          selectedUnitIds={selectedUnitIds}
          setSelectedUnitIds={setSelectedUnitIds}
          selectedUnits={selectedUnits}
          totalPrice={totalPrice}
          isOwner={isOwner}
          pendingImage={pendingImage}
          setPendingImage={setPendingImage}
          pendingLink={pendingLink}
          setPendingLink={setPendingLink}
          resalePrice={resalePrice}
          setResalePrice={setResalePrice}
          isForSale={isForSale} 
          setIsForSale={setIsForSale}
          canBuy={canBuy}
          handleImageUpload={handleImageUpload}
          handleUpdatePrice={handleUpdatePrice}
          handleBuy={handleBuy}
          isUpdatingPrice={isUpdatingPrice}
          isBuying={isBuying}
          settings={settings}
          onLoginClick={() => {
            setAuthMode('login');
            setShowAuthModal(true);
          }}
          handleModerateUnit={handleModerateUnit}
          handleResetUnits={handleResetUnits}
        />
      )}

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
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
                <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-[#262626] rounded-xl transition-colors text-gray-500 hover:text-white">
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
                        setFocusUnitId(myUnits.id);
                        setShowProfileModal(false);
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
                              setShowProfileModal(false);
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
        )}
      </AnimatePresence>

      {/* Admin Panel Modal */}
      <AnimatePresence>
        {showAdminPanel && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-8 border-bottom border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Admin Control</h2>
                  <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">Manage grid, users, and settings</p>
                </div>
                <button 
                  onClick={() => setShowAdminPanel(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-500 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                    <BarChart3 className="w-8 h-8 text-[#FF5733] mb-4" />
                    <div className="text-2xl font-bold text-white">${adminStats?.revenue?.toFixed(2)}</div>
                    <div className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Total Revenue</div>
                  </div>
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                    <Users className="w-8 h-8 text-blue-500 mb-4" />
                    <div className="text-2xl font-bold text-white">{adminStats?.users}</div>
                    <div className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Total Users</div>
                  </div>
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                    <BoxSelect className="w-8 h-8 text-emerald-500 mb-4" />
                    <div className="text-2xl font-bold text-white">{adminStats?.ownedUnits}</div>
                    <div className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Owned Units</div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-white text-sm font-bold uppercase tracking-widest">
                    <SettingsIcon className="w-4 h-4" />
                    Global Settings
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {adminSettings && Object.entries(adminSettings).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <label className="text-gray-500 text-[10px] uppercase tracking-widest">{key.replace(/_/g, ' ')}</label>
                        <input 
                          type="text"
                          value={value}
                          onChange={(e) => setAdminSettings({ ...adminSettings, [key]: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF5733] transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={async () => {
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
                        setSettings(adminSettings);
                      }
                    }}
                    className="bg-[#FF5733] text-white px-8 py-3 rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-[#FF5733]/80 transition-colors"
                  >
                    Save Settings
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-white text-sm font-bold uppercase tracking-widest">
                    <Users className="w-4 h-4" />
                    User Management
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
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0A0A0A] border border-[#262626] p-8 w-full max-w-md relative"
            >
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
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
                      type="text" 
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-[#141414] border border-[#262626] px-4 py-3 text-sm focus:outline-none focus:border-[#FF5733] transition-colors"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Username</label>
                  <input 
                    type="text" 
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] px-4 py-3 text-sm focus:outline-none focus:border-[#FF5733] transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Password</label>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] px-4 py-3 text-sm focus:outline-none focus:border-[#FF5733] transition-colors"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isAuthLoading}
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
        )}
      </AnimatePresence>
      <CursorTooltip selectedCount={selectedUnitIds.length} />
      
      {/* Background Loading Indicator */}
      {isLoading && units.length > 0 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-[#141414] border border-[#262626] px-4 py-2 flex items-center gap-3">
          <div className="w-2 h-2 bg-[#FF5733] rounded-full animate-pulse" />
          <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-gray-400">Syncing Grid...</span>
        </div>
      )}

      {/* Skeletal Loading Overlay */}
      {((isLoading && units.length === 0 && !forceHideLoading) || error) && (
        <div className="absolute inset-0 bg-[#0A0A0A] z-50 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-6 max-w-xs text-center">
            {isLoading && units.length === 0 && !forceHideLoading ? (
              <>
                <div className="w-12 h-12 border-4 border-[#262626] border-t-[#FF5733] rounded-full animate-spin" />
                <div className="text-[10px] uppercase tracking-[0.5em] text-white font-bold animate-pulse">
                  {settings?.ui_loading || 'Initializing Grid'}
                </div>
                {user && (
                  <div className="text-[8px] uppercase tracking-widest text-gray-500 font-bold mt-2">
                    Logged in as: {user.first_name}
                  </div>
                )}
                {forceShow && (
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => window.location.reload()}
                      className="mt-4 text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                    >
                      Taking too long? Reload
                    </button>
                    <button 
                      onClick={() => setForceHideLoading(true)}
                      className="text-[10px] uppercase tracking-widest text-[#FF5733] hover:text-white transition-colors"
                    >
                      Enter Anyway
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-[#FF5733] font-bold text-xs uppercase tracking-widest mb-2">Connection Error</div>
                <div className="text-gray-400 text-[10px] uppercase tracking-widest leading-relaxed">
                  {error}
                </div>
                <div className="flex flex-col gap-2 mt-6">
                  <button 
                    onClick={() => refresh()}
                    className="bg-white text-black px-8 py-3 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-gray-200 transition-colors"
                  >
                    Retry Connection
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('unity_grid_cache');
                      window.location.reload();
                    }}
                    className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                  >
                    Clear Cache & Reload
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Мобильная панель Setup & Buy */}
      {isMobile && selectedUnitIds.length > 0 && !isMobileSidebarOpen && (
        <div className="fixed bottom-0 left-0 w-full z-40 bg-[#141414] border-t border-[#262626] p-4 flex items-center justify-between pb-10 animate-in slide-in-from-bottom duration-300 pointer-events-auto">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#FF5733] uppercase font-bold tracking-widest">Selected Units</span>
            <span className="text-sm font-bold text-white uppercase">{selectedUnitIds.length} • {totalPrice.toFixed(2)} UNIT</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setSelectedUnitIds([])}
              className="px-4 py-2 text-[10px] uppercase font-bold text-gray-500 border border-[#262626]"
            >
              Clear
            </button>
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="bg-[#FF5733] text-white px-6 py-2 text-[10px] uppercase font-bold"
            >
              Setup & Buy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}