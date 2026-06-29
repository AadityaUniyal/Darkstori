import { memo, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart2,
  TrendingUp,
  MapPin,
  FlaskConical,
  Cpu,
  Leaf,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = memo(() => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    // Initial call
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { path: '/',              icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/analytics',    icon: BarChart2,         label: 'Analytics' },
    { path: '/forecast',     icon: TrendingUp,        label: 'Forecast' },
    { path: '/neighborhoods',icon: MapPin,            label: 'Neighborhoods' },
    { path: '/simulator',    icon: FlaskConical,     label: 'Simulator' },
    { path: '/algorithm-lab',icon: Cpu,               label: 'Algorithm Lab' },
    { path: '/recommendations',icon: Sparkles,         label: 'Recommendations' },
    { path: '/resilience',   icon: Leaf,             label: 'Resilience Cockpit' },
  ];

  // Mobile navigation below 640px: show 5 most-used routes as a bottom bar
  const isMobile = windowWidth < 640;

  if (isMobile) {
    return (
      <nav className="mobile-bottom-nav">
        {menuItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `mobile-nav-link ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={18} strokeWidth={1.75} />
            <span className="mobile-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon size={18} strokeWidth={1.75} />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Toggle Button at the bottom (only visible on desktop > 1024px) */}
      {windowWidth >= 1024 && (
        <button
          className="sidebar-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      )}
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
