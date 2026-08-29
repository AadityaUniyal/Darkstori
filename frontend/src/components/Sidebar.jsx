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
  Workflow
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

  const menuGroups = [
    {
      title: 'OPERATIONS',
      items: [
        { path: '/',          icon: Compass,         label: 'Expansion Cockpit' },
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/resilience',   icon: Leaf,             label: 'Resilience Cockpit' },
      ]
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { path: '/analytics', icon: BarChart2,       label: 'Analytics' },
        { path: '/forecast',     icon: TrendingUp,        label: 'Forecast' },
        { path: '/neighborhoods',icon: MapPin,            label: 'Neighborhoods' },
        { path: '/simulator',    icon: FlaskConical,     label: 'Simulator' },
      ]
    },
    {
      title: 'ADVANCED',
      items: [
        { path: '/algorithm-lab',icon: Cpu,               label: 'Algorithm Lab' },
        { path: '/recommendations',icon: Sparkles,         label: 'Recommendations' },
        { path: '/events',       icon: Calendar,         label: 'Local Events' },
        { path: '/playbooks',    icon: Workflow,         label: 'Playbooks' },
      ]
    }
  ];

  const mobileRoutes = [
    { path: '/',          icon: Compass,         label: 'Expansion' },
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/analytics', icon: BarChart2,       label: 'Analytics' },
    { path: '/neighborhoods',icon: MapPin,            label: 'Places' },
    { path: '/simulator',    icon: FlaskConical,     label: 'Simulator' },
  ];

  // Mobile navigation below 640px
  const isMobile = windowWidth < 640;

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 h-[60px] bg-[#0b0d14]/95 backdrop-blur-md border-t border-border flex justify-around items-center z-[1000] pb-safe">
        {mobileRoutes.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] font-medium flex-1 text-center transition-colors ${isActive ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'}`
            }
          >
            <item.icon size={20} strokeWidth={isActive ? 2 : 1.75} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <aside className={`flex flex-col bg-[#090b11]/85 backdrop-blur-md border-r border-border h-[calc(100vh-64px)] sticky top-[64px] z-[900] overflow-y-auto transition-[width] duration-300 ease-in-out flex-shrink-0 ${isCollapsed ? 'w-[72px]' : 'w-[240px]'}`}>
      <nav className="flex-1 py-4 flex flex-col gap-6 overflow-y-auto scrollbar-thin">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            {!isCollapsed ? (
              <div className="px-5 text-[12px] font-semibold text-muted-foreground tracking-wider mb-1">
                {group.title}
              </div>
            ) : (
              <div className="h-4 border-b border-border/20 mx-4 mb-2 mt-1"></div>
            )}
            
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-5 py-2.5 transition-all duration-200 text-[13px] font-medium border-l-[3px] ${
                    isActive 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500' 
                      : 'text-muted-foreground border-transparent hover:bg-surface hover:text-foreground'
                  }`
                }
              >
                <div className="relative flex items-center justify-center">
                  <item.icon size={18} strokeWidth={1.75} />
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
          className="w-full py-4 border-t border-border flex items-center justify-center text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
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
