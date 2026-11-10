import { memo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, User, ChevronDown, Search, UploadCloud, Webhook, Scan, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
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
import './Navbar.css';
import './CitySelector.css';

const Navbar = memo(() => {
  const { user, isAuthenticated, logout } = useAuth();
  const { activeRole, setRole: setOperationalRole } = useRole();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Notifications State & Logic from Store
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [importerOpen, setImporterOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ciamOpen, setCiamOpen] = useState(false);
  const notifRef = useRef(null);
  const { notifications, markRead, clearNotifications } = useSocketStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleOpenImporter = () => setImporterOpen(true);
    const handleOpenSettings = () => setSettingsOpen(true);
    window.addEventListener('darkstori:open-importer', handleOpenImporter);
    window.addEventListener('darkstori:open-settings', handleOpenSettings);

    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('darkstori:open-importer', handleOpenImporter);
      window.removeEventListener('darkstori:open-settings', handleOpenSettings);
      document.removeEventListener('mousedown', handleClick);
    };
  }, []);

  const initials = user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'O');

  return (
    <nav className="navbar">
      <div className="flex items-center gap-3">
        <div className="navbar-brand cursor-pointer" onClick={() => navigate('/')}>
          <span className="brand-text">DarkStori</span>
          <span className="brand-pulse-dot" />
        </div>

        {/* Real User Active Dark Store Pod Pill */}
        {isAuthenticated && user?.store && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 font-mono shadow-sm">
            <Store size={13} className="text-amber-400 shrink-0" />
            <span className="font-bold truncate max-w-[160px] text-white/90">{user.store.name}</span>
            <span className="text-white/40">·</span>
            <span className="text-amber-400 font-semibold">{user.store.city}</span>
            {user.store.sla && (
              <>
                <span className="text-white/40">·</span>
                <span className="text-emerald-400 font-bold">{user.store.sla} SLA</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="navbar-actions">
        {isAuthenticated ? (
          <>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('darkstori:open-command-palette'))}
              className="flex items-center justify-between bg-white/[0.05] hover:bg-white/[0.08] hover:border-amber-500/40 border border-white/10 rounded-full px-3.5 py-1.5 md:w-56 cursor-pointer transition-all duration-200 text-left group shadow-sm backdrop-blur-xl"
              title="Search corridors, metrics, actions (⌘K)"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Search className="text-white/40 group-hover:text-amber-400 transition-colors w-[15px] h-[15px] shrink-0" />
                <span className="hidden md:inline text-xs text-white/55 group-hover:text-white transition-colors truncate">Spotlight search...</span>
              </div>
              <kbd className="hidden md:inline text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/[0.06] text-white/40 border border-white/10 group-hover:border-amber-500/30 group-hover:text-amber-400 transition-colors shrink-0">⌘K</kbd>
            </button>
            
            <CitySelector />
            
            <button
              onClick={() => navigate('/vision')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all shadow-sm cursor-pointer"
              title="Launch VisionPack AI Optical Dock"
            >
              <Scan size={14} className="text-amber-400" />
              <span className="hidden xl:inline">VisionPack</span>
            </button>
            
            <button
              onClick={() => setImporterOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-xs font-semibold transition-all shadow-sm cursor-pointer"
              title="Upload CSV Catalog & Inventory"
            >
              <UploadCloud size={14} className="text-emerald-400" />
              <span className="hidden xl:inline">Import</span>
            </button>
            
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/25 text-xs font-semibold transition-all shadow-sm cursor-pointer"
              title="Storefront & Webhooks Integration"
            >
              <Webhook size={14} className="text-violet-400" />
              <span className="hidden 2xl:inline">Webhooks</span>
            </button>
            
            <ConnectionStatus />
            <ThemeToggle />
            
            {/* Notification Drawer Container */}
            <div className="notification-container" ref={notifRef}>
              <button 
                className={`icon-button notification-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`} 
                title="Notifications"
                onClick={() => setNotificationsOpen(v => !v)}
              >
                <Bell size={18} />
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

            <div className="hidden lg:flex items-center">
              <ApplePersonaSelector
                activePersona={activeRole}
                onSelectPersona={(r) => setOperationalRole(r)}
                audioFeedback={() => floorAudio.click()}
                compact={true}
              />
            </div>

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
