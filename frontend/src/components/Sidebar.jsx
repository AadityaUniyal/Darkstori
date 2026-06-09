import { memo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Leaf,
  FlaskConical,
  MapPin,
  BarChart2,
  TrendingUp,
  Cpu,
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = memo(() => {
  const menuItems = [
    { path: '/',              icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/resilience',   icon: Leaf,             label: 'Zero-Waste Engine' },
    { path: '/simulator',    icon: FlaskConical,     label: 'Simulator' },
    { path: '/neighborhoods',icon: MapPin,            label: 'Neighborhoods' },
    { path: '/analytics',    icon: BarChart2,         label: 'Analytics' },
    { path: '/forecast',     icon: TrendingUp,        label: 'AI Forecast' },
    { path: '/algorithm-lab',icon: Cpu,               label: 'Algorithmic Mind' },
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
