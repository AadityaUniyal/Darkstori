import { memo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Bell, LogOut, User, ChevronDown, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CitySelector from './CitySelector';
import ConnectionStatus from './ui/connection-status';
import { ThemeToggle } from './ThemeToggle';
import { useSocketStore } from '../stores/socketStore';
import './Navbar.css';
import './CitySelector.css';

const Navbar = memo(() => {
  const { user, isAuthenticated, logout, setRole } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Notifications State & Logic from Store
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifRef = useRef(null);
  const { notifications, markAllRead, markRead, clearNotifications } = useSocketStore();
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
              className="flex md:w-52 items-center justify-center md:justify-between bg-transparent md:bg-card/50 hover:bg-accent/40 md:border border-transparent md:border-border rounded-lg md:px-3 py-1.5 md:mr-2 cursor-pointer transition-all text-left group"
              title="Search"
            >
              <div className="flex items-center gap-2">
                <Search className="text-muted-foreground group-hover:text-foreground transition-colors w-[18px] h-[18px] md:w-[14px] md:h-[14px]" />
                <span className="hidden md:inline text-xs text-muted-foreground group-hover:text-foreground transition-colors">Search & actions...</span>
              </div>
              <kbd className="hidden md:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground border border-border/50">⌘K</kbd>
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
                    <label className="text-[0.75rem] text-muted-foreground block mb-1">Switch Role (Demo):</label>
                    <select
                      value={user?.role || 'admin'}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-surface border border-border text-foreground rounded px-2 py-1 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="admin">Admin</option>
                      <option value="expansion_lead">Expansion Lead</option>
                      <option value="finance_reviewer">Finance Reviewer</option>
                      <option value="regional_head">Regional Head</option>
                    </select>
                  </div>
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
