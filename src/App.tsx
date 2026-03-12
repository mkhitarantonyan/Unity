import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { UnityCanvas } from './components/UnityCanvas';
import { Sidebar } from './components/Sidebar';
import { Minimap } from './components/Minimap';
import { FloatingMenu } from './components/FloatingMenu';
import { CursorTooltip } from './components/CursorTooltip';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { AuthModal } from './components/modals/AuthModal';
import { ProfileModal } from './components/modals/ProfileModal';
import { AdminPanel } from './components/modals/AdminPanel';
import { LegalModal } from './components/modals/LegalModal';
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
    fetch('/api/settings')
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
  const [legalType, setLegalType] = useState<'terms' | 'privacy' | 'refund' | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const [showAdminPanel, setShowAdminPanel] = useState(false);

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
      
      if (user && selectedUnitIds.length === 1 && selectedUnits.length === 1 && selectedUnits[0]?.owner_id === user.id) {
        const selectedUnit = selectedUnits[0];
        setPendingLink(selectedUnit?.metadata?.link || '');
        setIsForSale(!!selectedUnit?.metadata?.is_for_sale);
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
      const anchorId = selectedUnitIds[selectedUnitIds.length - 1];
      const anchor = units.find(u => u.id === anchorId);
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
            image_url: pendingImage || selectedUnits[0]?.metadata?.image_url || '',
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
      <Header 
        settings={settings}
        user={user}
        myUnitsCount={myUnits.length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearch={handleSearch}
        setShowProfileModal={setShowProfileModal}
        setShowAdminPanel={setShowAdminPanel}
        setAuthMode={setAuthMode}
        setShowAuthModal={setShowAuthModal}
        handleLogout={handleLogout}
      />

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
      {/* Toolbar (Zoom, Guides, Selection) */}
      <Toolbar 
        isMobile={isMobile}
        showGuides={showGuides}
        setShowGuides={setShowGuides}
        isSelectionMode={isSelectionMode}
        setIsSelectionMode={setIsSelectionMode}
        // onZoomIn={...}  <- потом привяжем зум
        // onZoomOut={...} <- потом привяжем зум
      />

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
          isMobile={isMobile}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
      )}
      {/* Profile Modal */}
      <ProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        myUnits={myUnits}
        myTotalValue={myTotalValue}
        setSelectedUnitIds={setSelectedUnitIds}
        setFocusUnitId={setFocusUnitId}
      />
      {/* Admin Panel Modal */}
      <AdminPanel 
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
        user={user}
        setGlobalSettings={setSettings}
      />
{/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        initialMode={authMode}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(newUser) => {
          setUser(newUser);
          refresh(); // обновляем сетку после логина
        }}
        onOpenLegal={setLegalType}
      />
      {/* Окно с документами */}
      <LegalModal 
        isOpen={!!legalType} 
        type={legalType} 
        onClose={() => setLegalType(null)} 
      />
      {/* Legal Modal */}
      <LegalModal 
        isOpen={!!legalType} 
        type={legalType} 
        onClose={() => setLegalType(null)} 
      />
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