import { memo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, User, ChevronDown, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import CitySelector from './CitySelector';
import ConnectionStatus from './ui/connection-status';
import { ThemeToggle } from './ThemeToggle';
import { useSocketStore } from '../stores/socketStore';
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
  const notifRef = useRef(null);
  const { notifications, markRead, clearNotifications } = useSocketStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = user?.email ? user.email.charAt(0).toUpperCase() : 'A';

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/')}>
        <span className="brand-text">Darkstori</span>
        <span className="brand-pulse-dot" />
      </div>
      <div className="navbar-actions">
        {isAuthenticated && (
          <>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('darkstori:open-command-palette'))}
              className="flex items-center justify-between bg-white/[0.05] hover:bg-white/[0.08] hover:border-[#FF9F1C]/40 border border-white/10 rounded-full px-3.5 py-1.5 md:w-60 cursor-pointer transition-all duration-200 text-left group shadow-sm hover:shadow-[0_0_16px_rgba(255,159,28,0.15)] backdrop-blur-xl"
              title="Search corridors, metrics, actions (⌘K)"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Search className="text-white/40 group-hover:text-[#FF9F1C] transition-colors w-[15px] h-[15px] shrink-0" />
                <span className="hidden md:inline text-xs text-white/55 group-hover:text-white transition-colors truncate">Spotlight search...</span>
              </div>
              <kbd className="hidden md:inline text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/[0.06] text-white/40 border border-white/10 group-hover:border-[#FF9F1C]/30 group-hover:text-[#FF9F1C] transition-colors shrink-0">⌘K</kbd>
            </button>
            
            <CitySelector />
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

            <div className="user-menu" ref={menuRef}>
              <button className="user-button" onClick={() => setMenuOpen((v) => !v)}>
                <span className="user-avatar">{initials}</span>
                <span className="hidden sm:inline user-name">{user?.email?.split('@')[0] || 'User'}</span>
                <ChevronDown size={14} className={`user-chevron ${menuOpen ? 'open' : ''}`} />
              </button>
              {menuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <span className="user-dropdown-email">{user?.email}</span>
                    <span className="user-dropdown-role">Role: <strong>{user?.role}</strong></span>
                  </div>
                  <div className="user-dropdown-divider" />
                  <div className="px-4 py-2">
                    <label className="text-[0.75rem] text-muted-foreground block mb-1">Operational Role:</label>
                    <select
                      value={activeRole}
                      onChange={(e) => setOperationalRole(e.target.value)}
                      className="w-full bg-surface border border-border text-foreground rounded px-2 py-1 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                    <span>Product Tour</span>
                    <span className="text-[10px] text-amber-500 font-mono">Guide</span>
                  </button>
                  <div className="user-dropdown-divider" />
                  <button
                    className="user-dropdown-item"
                    onClick={() => { logout(); navigate('/login'); }}
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        {!isAuthenticated && (
          <button className="login-btn" onClick={() => navigate('/login')}>
            <User size={16} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </nav>
  );
});

Navbar.displayName = 'Navbar';

export default Navbar;
