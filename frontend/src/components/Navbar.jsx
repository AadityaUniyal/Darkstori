import { memo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CitySelector from './CitySelector';
import './Navbar.css';
import './CitySelector.css';

const Navbar = memo(() => {
  const { user, isAuthenticated, logout, setRole } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Notifications State & Logic
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'info',
      message: 'Zero-Waste Engine: Initialized. Demographics sync complete.',
      timestamp: '5m ago',
      read: false
    },
    {
      id: 2,
      type: 'success',
      message: 'Model loaded: demand_forecasting_model v2.4.1 in Production.',
      timestamp: '15m ago',
      read: false
    },
    {
      id: 3,
      type: 'warning',
      message: 'Model Drift: Pincode 560001 population drift KS-stat=0.142.',
      timestamp: '1h ago',
      read: true
    }
  ]);
  const notifRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

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

  useEffect(() => {
    const handleNewNotification = (e) => {
      const { type, message } = e.detail || {};
      if (message) {
        setNotifications(prev => [
          {
            id: Date.now() + Math.random(),
            type: type || 'info',
            message,
            timestamp: 'Just Now',
            read: false
          },
          ...prev
        ]);
      }
    };
    window.addEventListener('darkstori:notification', handleNewNotification);
    return () => window.removeEventListener('darkstori:notification', handleNewNotification);
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
            <CitySelector />
            
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
                        <button className="mark-read-btn" onClick={markAllAsRead}>
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
                          onClick={() => markAsRead(n.id)}
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
                <span className="user-name">{user?.email?.split('@')[0] || 'User'}</span>
                <ChevronDown size={14} className={`user-chevron ${menuOpen ? 'open' : ''}`} />
              </button>
              {menuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <span className="user-dropdown-email">{user?.email}</span>
                    <span className="user-dropdown-role">Role: <strong>{user?.role}</strong></span>
                  </div>
                  <div className="user-dropdown-divider" />
                  <div style={{ padding: '8px 16px' }}>
                    <label style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Switch Role (Demo):</label>
                    <select
                      value={user?.role || 'admin'}
                      onChange={(e) => {
                        setRole(e.target.value);
                      }}
                      style={{ width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', borderRadius: '4px', padding: '4px', fontSize: '0.8rem', cursor: 'pointer' }}
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
