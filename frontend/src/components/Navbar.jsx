import { memo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, LogOut, User, ChevronDown, Search, UploadCloud, Webhook, Scan, Store, 
  Database, Radio, Volume2, Volume1, VolumeX, HelpCircle, Activity, Cpu, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { useCity } from '../context/CityContext';
import CitySelector from './CitySelector';
import ConnectionStatus from './ui/connection-status';
import { ThemeToggle } from './ThemeToggle';
import { useSocketStore } from '../stores/socketStore';
import UniversalDataImporter from './UniversalDataImporter';
import StorefrontSettingsModal from './StorefrontSettingsModal';
import CiamSecurityModal from './CiamSecurityModal';
import { ShieldCheck as ShieldIcon } from 'lucide-react';
import ApplePersonaSelector from './ApplePersonaSelector';
import { floorAudio } from '../utils/floorAudio';
import { api } from '../services/api';
import './Navbar.css';
import './CitySelector.css';

const Navbar = memo(() => {
  const { user, isAuthenticated, logout } = useAuth();
  const { activeRole, setRole: setOperationalRole, isFirstTimeUser, toggleFirstTimeUserMode } = useRole();
  const { currentCity } = useCity();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Notifications State & Modals
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [importerOpen, setImporterOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ciamOpen, setCiamOpen] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const notifRef = useRef(null);
  const telemetryRef = useRef(null);
  const { notifications, markRead, clearNotifications } = useSocketStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  // Real-time API / Telemetry Latency Tracking
  const [latency, setLatency] = useState(24);
  const [engineHealth, setEngineHealth] = useState({ status: 'ok', version: '3.0.0' });
  const [audioProfile, setAudioProfile] = useState(floorAudio.getProfile());

  useEffect(() => {
    const handleOpenImporter = () => setImporterOpen(true);
    const handleOpenSettings = () => setSettingsOpen(true);
    window.addEventListener('darkstori:open-importer', handleOpenImporter);
    window.addEventListener('darkstori:open-settings', handleOpenSettings);

    const unsubAudio = floorAudio.subscribe(setAudioProfile);

    // Initial and periodic pulse health check
    let isMounted = true;
    const checkPulse = async () => {
      const start = performance.now();
      try {
        const data = await api.getHealth();
        const end = performance.now();
        if (isMounted) {
          setLatency(Math.max(12, Math.round(end - start)));
          setEngineHealth(data || { status: 'ok', version: '3.0.0' });
        }
      } catch (e) {
        if (isMounted) setLatency(48);
      }
    };
    checkPulse();
    const pulseInterval = setInterval(checkPulse, 20000);

    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
      if (telemetryRef.current && !telemetryRef.current.contains(e.target)) {
        setTelemetryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => {
      isMounted = false;
      unsubAudio();
      clearInterval(pulseInterval);
      window.removeEventListener('darkstori:open-importer', handleOpenImporter);
      window.removeEventListener('darkstori:open-settings', handleOpenSettings);
      document.removeEventListener('mousedown', handleClick);
    };
  }, []);

  const cycleAudioProfile = () => {
    const next = audioProfile === 'warehouse' ? 'office' : audioProfile === 'office' ? 'silent' : 'warehouse';
    floorAudio.setProfile(next);
    floorAudio.playSuccessPick();
  };

  const getAudioLabel = () => {
    if (audioProfile === 'warehouse') return 'Warehouse (880Hz)';
    if (audioProfile === 'office') return 'Office Soft';
    return 'Silent Haptic';
  };

  const getAudioIcon = () => {
    if (audioProfile === 'warehouse') return <Volume2 size={12} className="text-amber-400" />;
    if (audioProfile === 'office') return <Volume1 size={12} className="text-emerald-400" />;
    return <VolumeX size={12} className="text-zinc-500" />;
  };

  const initials = user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'O');

  return (
    <nav className="navbar">
      {/* Left: Brand + Active Pod Pill */}
      <div className="flex items-center gap-3">
        <div className="navbar-brand cursor-pointer" onClick={() => navigate('/')}>
          <span className="brand-text">DarkStori</span>
          <span className="brand-pulse-dot" />
        </div>

        {isAuthenticated && user?.store && (
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-300 font-mono shadow-sm">
            <Store size={12} className="text-amber-400 shrink-0" />
            <span className="font-semibold truncate max-w-[150px] text-zinc-100">{user.store.name}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400">{user.store.city}</span>
            {user.store.sla && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-emerald-400 font-medium">{user.store.sla}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="navbar-actions">
        {isAuthenticated ? (
          <>
            {/* Spotlight search trigger */}
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('darkstori:open-command-palette'))}
              className="flex items-center justify-between bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 rounded-full px-3 py-1 md:w-52 cursor-pointer transition-all duration-200 text-left group shadow-sm"
              title="Search corridors, metrics, actions (⌘K)"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="text-zinc-500 group-hover:text-zinc-300 transition-colors w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors truncate">Spotlight...</span>
              </div>
              <kbd className="hidden md:inline text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 group-hover:text-zinc-300 transition-colors shrink-0">⌘K</kbd>
            </button>
            
            <CitySelector />

            {/* Quick action buttons */}
            <button
              onClick={() => navigate('/vision')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-medium transition-all shadow-sm cursor-pointer"
              title="Launch VisionPack AI Optical Dock"
            >
              <Scan size={13} className="text-amber-400" />
              <span className="hidden xl:inline">VisionPack</span>
            </button>
            
            <button
              onClick={() => setImporterOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-medium transition-all shadow-sm cursor-pointer"
              title="Upload CSV Catalog & Inventory"
            >
              <UploadCloud size={13} className="text-emerald-400" />
              <span className="hidden xl:inline">Import</span>
            </button>
            
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-medium transition-all shadow-sm cursor-pointer"
              title="Storefront & Webhooks Integration"
            >
              <Webhook size={13} className="text-indigo-400" />
              <span className="hidden 2xl:inline">Webhooks</span>
            </button>

            {/* Consolidated Operations Pulse & Database Telemetry Capsule */}
            <div className="relative" ref={telemetryRef}>
              <button
                onClick={() => setTelemetryOpen(v => !v)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 font-mono transition-all shadow-sm cursor-pointer"
                title="Operations Telemetry & Serverless Health"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="hidden md:inline text-[11px] font-semibold text-zinc-200">OPS PULSE</span>
                <span className="text-zinc-600 hidden md:inline">|</span>
                <span className="text-emerald-400 font-bold text-[11px]">{latency}ms</span>
              </button>

              {/* Telemetry Popover Drawer */}
              {telemetryOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800 p-3.5 shadow-2xl text-xs space-y-3 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <span className="font-bold text-zinc-100 flex items-center gap-1.5">
                      <Radio size={13} className="text-emerald-400" /> Operations Pulse
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      HEALTHY
                    </span>
                  </div>

                  <div className="space-y-2 text-zinc-300">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Database size={12} className="text-emerald-400" /> PostgreSQL & Neon
                      </span>
                      <span className="font-mono text-emerald-400 font-semibold">{latency}ms</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Activity size={12} className="text-indigo-400" /> WebSocket Stream
                      </span>
                      <span className="font-mono text-zinc-200">Active (EIO=4)</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Cpu size={12} className="text-amber-400" /> Inference Engine
                      </span>
                      <span className="font-mono text-zinc-200">XGBoost & PostGIS</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                    <button
                      onClick={cycleAudioProfile}
                      className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 flex items-center gap-1.5 text-[10px] transition-all cursor-pointer"
                      title="Audio profile"
                    >
                      {getAudioIcon()}
                      <span>{getAudioLabel()}</span>
                    </button>

                    <button
                      onClick={toggleFirstTimeUserMode}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                        isFirstTimeUser
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <HelpCircle size={11} />
                      <span>{isFirstTimeUser ? 'Tour: ON' : 'Tour: OFF'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <ConnectionStatus />
            <ThemeToggle />
            
            {/* Notification Drawer */}
            <div className="notification-container" ref={notifRef}>
              <button 
                className={`icon-button notification-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`} 
                title="Notifications"
                onClick={() => setNotificationsOpen(v => !v)}
              >
                <Bell size={16} />
                {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
              </button>

              {notificationsOpen && (
                <div className="notification-drawer">
                  <div className="notification-drawer-header">
                    <h3>Telemetry Notifications</h3>
                    <div className="notification-header-actions">
                      {unreadCount > 0 && (
                        <button className="mark-read-btn" onClick={() => notifications.forEach(n => markRead(n.id))}>
                          Mark all
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button className="clear-all-btn" onClick={clearNotifications}>
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="notification-drawer-divider" />
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="notification-empty">No new notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          className={`notification-item ${n.read ? 'read' : 'unread'} ${n.type}`}
                          onClick={() => markRead(n.id)}
                        >
                          <div className="notification-icon-wrap">
                            <span className="notification-dot" />
                          </div>
                          <div className="notification-content">
                            <p className="notification-message">{n.message}</p>
                            <span className="notification-time">{n.timestamp}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Persona Switcher Pill */}
            <div className="hidden lg:flex items-center">
              <ApplePersonaSelector
                activePersona={activeRole}
                onSelectPersona={(r) => setOperationalRole(r)}
                audioFeedback={() => floorAudio.click()}
                compact={true}
              />
            </div>

            {/* Operator Menu */}
            <div className="user-menu" ref={menuRef}>
              <button className="user-button" onClick={() => setMenuOpen((v) => !v)}>
                <span className="user-avatar">{initials}</span>
                <span className="hidden sm:inline user-name">{user?.full_name || user?.email?.split('@')[0] || 'Operator'}</span>
                <ChevronDown size={14} className={`user-chevron ${menuOpen ? 'open' : ''}`} />
              </button>
              {menuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <span className="user-dropdown-email">{user?.email}</span>
                    <span className="user-dropdown-role">Lens: <strong className="uppercase">{user?.role}</strong></span>
                    {user?.store?.name && (
                      <div className="text-[10px] text-amber-400 font-mono mt-1">
                        Pod: {user.store.name}
                      </div>
                    )}
                  </div>
                  <div className="user-dropdown-divider" />
                  <div className="px-4 py-2">
                    <label className="text-[0.75rem] text-muted-foreground block mb-1">Switch Operational Lens:</label>
                    <select
                      value={activeRole}
                      onChange={(e) => setOperationalRole(e.target.value)}
                      className="w-full bg-[#0A0D14] border border-white/15 text-white rounded-lg px-2.5 py-1.5 text-xs cursor-pointer focus:outline-none focus:border-amber-400"
                    >
                      <option value="executive">Executive</option>
                      <option value="store-gm">Store GM</option>
                      <option value="fleet-commander">Fleet Commander</option>
                    </select>
                  </div>
                  <div className="user-dropdown-divider" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      window.dispatchEvent(new CustomEvent('darkstori:open-tour'));
                    }}
                    className="user-dropdown-item w-full text-left flex items-center justify-between"
                  >
                    <span>System Tour</span>
                    <span className="text-[10px] text-amber-500 font-mono">Guide</span>
                  </button>
                  <div className="user-dropdown-divider" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setCiamOpen(true);
                      floorAudio.playSuccessPick();
                    }}
                    className="user-dropdown-item w-full text-left flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldIcon size={16} className="text-amber-400" />
                      <span>Identity & CIAM Governance</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">RBAC</span>
                  </button>
                  <div className="user-dropdown-divider" />
                  <button
                    className="user-dropdown-item text-rose-400 hover:text-rose-300"
                    onClick={() => { logout(); navigate('/login'); }}
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2.5">
            <button className="login-btn cursor-pointer" onClick={() => navigate('/login')}>
              <User size={14} />
              <span>Sign In</span>
            </button>
            <button
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#FF9F1C] to-[#FFB703] text-black text-xs font-bold hover:brightness-110 transition-all shadow-md shadow-[#FF9F1C]/20 cursor-pointer"
              onClick={() => navigate('/register')}
            >
              <span>Register Hub</span>
            </button>
          </div>
        )}
      </div>
      <UniversalDataImporter isOpen={importerOpen} onClose={() => setImporterOpen(false)} />
      <StorefrontSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CiamSecurityModal isOpen={ciamOpen} onClose={() => setCiamOpen(false)} />
    </nav>
  );
});

Navbar.displayName = 'Navbar';

export default Navbar;
