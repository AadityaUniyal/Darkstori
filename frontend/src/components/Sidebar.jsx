import { memo, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  BarChart2,
  TrendingUp,
  MapPin,
  FlaskConical,
  Cpu,
  Leaf,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calendar,
  Workflow,
  Radio
} from 'lucide-react';
import { useRole } from '../context/RoleContext';
import './Sidebar.css';

const Sidebar = memo(() => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const { activeRole } = useRole();

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
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuGroups = [
    {
      title: 'OPERATIONS',
      items: [
        { path: '/cockpit',     icon: Compass,         label: 'Network Cockpit' },
        { path: '/dashboard',   icon: LayoutDashboard, label: 'Performance Overview' },
        { path: '/resilience',  icon: Leaf,            label: 'Freshness & Pricing' },
      ]
    },
    {
      title: 'INTELLIGENCE & EXPANSION',
      items: [
        { path: '/forecast',      icon: TrendingUp,      label: 'Demand Forecast' },
        { path: '/neighborhoods', icon: MapPin,          label: 'City Exploration' },
        { path: '/simulator',     icon: FlaskConical,    label: 'Store Simulator' },
        { path: '/analytics',     icon: BarChart2,       label: 'Coverage & SLA' },
      ]
    },
    {
      title: 'AUTOMATION & ADVISORY',
      items: [
        { path: '/playbooks',     icon: Workflow,        label: 'Automation Rules' },
        { path: '/events',        icon: Calendar,        label: 'Surge Events' },
        { path: '/recommendations', icon: Sparkles,      label: 'Smart Insights' },
        { path: '/algorithm-lab', icon: Cpu,             label: 'System Intelligence' },
      ]
    }
  ];

  const mobileRoutes = [
    { path: '/cockpit',     icon: Compass,         label: 'Cockpit' },
    { path: '/dashboard',   icon: LayoutDashboard, label: 'Overview' },
    { path: '/resilience',  icon: Leaf,            label: 'Freshness' },
    { path: '/forecast',    icon: TrendingUp,      label: 'Forecast' },
    { path: '/playbooks',   icon: Workflow,        label: 'Rules' },
  ];

  // Mobile navigation below 640px
  const isMobile = windowWidth < 640;

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 h-[64px] bg-[#07090E]/95 backdrop-blur-xl border-t border-white/[0.08] flex justify-around items-center z-[1000] pb-safe px-2">
        {mobileRoutes.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] font-semibold flex-1 text-center py-1 transition-all rounded-xl ${
                isActive ? 'text-[#38BDF8] bg-[#0071E3]/15' : 'text-white/50 hover:text-white'
              }`
            }
          >
            <item.icon size={19} strokeWidth={isActive ? 2.2 : 1.75} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <aside className={`flex flex-col bg-[#07090E]/90 backdrop-blur-2xl border-r border-white/[0.08] h-[calc(100vh-64px)] sticky top-[64px] z-[900] overflow-y-auto transition-[width] duration-300 ease-in-out flex-shrink-0 ${isCollapsed ? 'w-[72px]' : 'w-[244px]'}`}>
      <nav className="flex-1 py-3 flex flex-col gap-4 overflow-y-auto scrollbar-thin">
        {!isCollapsed && (
          <div className="mx-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-white/40 uppercase">OPERATIONAL LENS</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0071E3]/15 text-[#38BDF8] border border-[#0071E3]/30">
                {activeRole === 'executive' ? 'Executive' : activeRole === 'store-gm' ? 'Store GM' : 'Fleet Cmd'}
              </span>
            </div>
          </div>
        )}

        {menuGroups.map((group, idx) => (
          <div key={idx} className="flex flex-col gap-0.5">
            {!isCollapsed ? (
              <div className="px-4 text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1 mt-1">
                {group.title}
              </div>
            ) : (
              <div className="h-px bg-white/[0.06] mx-4 mb-2 mt-1"></div>
            )}
            
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 mx-2.5 px-3 py-2 rounded-xl transition-all duration-200 text-[12.5px] font-medium ${
                    isActive 
                      ? 'bg-[#0071E3]/15 text-[#38BDF8] border border-[#0071E3]/30 font-semibold shadow-[0_0_12px_rgba(0,113,227,0.15)]' 
                      : 'text-white/60 border border-transparent hover:bg-white/[0.04] hover:text-white'
                  }`
                }
              >
                <div className="relative flex items-center justify-center flex-shrink-0">
                  <item.icon size={17} strokeWidth={1.8} />
                </div>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Collapse Toggle Button at the bottom */}
      {windowWidth >= 1024 && (
        <button
          className="w-full py-3 border-t border-white/[0.08] flex items-center justify-center text-white/50 hover:bg-white/[0.04] hover:text-white transition-colors"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      )}
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
