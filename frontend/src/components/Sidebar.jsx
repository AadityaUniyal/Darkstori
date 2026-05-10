import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  BarChart3, 
  TrendingUp, 
  Database,
  Settings,
  Radio
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/live-map', icon: Map, label: 'Live Map' },
    { path: '/live-feed', icon: Radio, label: 'Live Feed' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/predictions', icon: TrendingUp, label: 'Predictions' },
    { path: '/data', icon: Database, label: 'Data' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
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
};

export default Sidebar;
