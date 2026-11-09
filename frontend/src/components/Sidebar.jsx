import { memo, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Compass,
  Package,
  Layers,
  Truck,
  BarChart3,
  ShieldAlert,
  DollarSign,
  Scan,
  Radio,
  Smartphone,
  Globe,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useRole } from '../context/RoleContext';
import './Sidebar.css';

const ALL_8_FEATURES = [
  {
    title: 'NETWORK OPERATIONS & NOC',
    items: [
      { path: '/directory',  icon: Globe,      label: 'Pan-India Geo-Directory', featureNum: 'MAP', role: 'executive' },
      { path: '/noc',        icon: Radio,      label: 'Metro NOC & Pod Mesh',   featureNum: 'NOC', role: 'executive' },
      { path: '/expansion',  icon: Compass,    label: 'Catchment & Expansion', featureNum: '01', role: 'executive' },
      { path: '/inventory',  icon: Package,    label: 'Demand & Inbound Dock', featureNum: '02', role: 'store-gm' },
      { path: '/floor',      icon: Layers,     label: 'Floor Twin & Heatmap',   featureNum: '03', role: 'store-gm' },
      { path: '/dispatch',   icon: Truck,      label: 'Dispatch & COD Vault',   featureNum: '04', role: 'fleet-commander' },
    ]
  },
  {
    title: 'OPERATIONS & INTELLIGENCE',
    items: [
      { path: '/terminal',   icon: Smartphone, label: 'Handheld Picker PWA',   featureNum: 'HHT', role: 'store-gm' },
      { path: '/competitor', icon: BarChart3,  label: 'Competitor Radar & Intel', featureNum: '05', role: 'executive' },
      { path: '/playbooks',  icon: ShieldAlert,label: 'Disruption Playbooks',   featureNum: '06', role: 'fleet-commander' },
      { path: '/economics',  icon: DollarSign, label: 'EBITDA & Board Dossier', featureNum: '07', role: 'executive' },
      { path: '/vision',     icon: Scan,       label: 'Vision Packing & QA',     featureNum: '08', role: 'store-gm' },
    ]
  }
];

const Sidebar = memo(() => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const { activeRole, roleConfig } = useRole();

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

  const mobileRoutes = [
    { path: '/noc',        icon: Radio,      label: 'NOC' },
    { path: '/terminal',   icon: Smartphone, label: 'Terminal' },
    { path: '/expansion',  icon: Compass,    label: 'Expansion' },
    { path: '/floor',      icon: Layers,     label: 'Floor' },
    { path: '/dispatch',   icon: Truck,      label: 'Dispatch' },
  ];

  const isMobile = windowWidth < 640;

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 h-[64px] bg-[#07090E]/95 backdrop-blur-xl border-t border-white/[0.08] flex justify-around items-center z-[1000] pb-safe px-2">
        {mobileRoutes.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] font-semibold flex-1 text-center py-1 transition-all rounded-xl ${
                isActive ? 'text-amber-400 bg-white/10' : 'text-white/50 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.75} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <aside className={`flex flex-col bg-[#07090E]/90 backdrop-blur-2xl border-r border-white/[0.08] h-[calc(100vh-64px)] sticky top-[64px] z-[900] overflow-y-auto transition-[width] duration-300 ease-in-out flex-shrink-0 ${isCollapsed ? 'w-[72px]' : 'w-[250px]'}`}>
      <nav className="flex-1 py-3 flex flex-col gap-3 overflow-y-auto scrollbar-thin">
        {!isCollapsed && (
          <div className="mx-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-white/40 uppercase">ACTIVE LENS</span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{
                  backgroundColor: `${roleConfig.primaryColor}20`,
                  color: roleConfig.primaryColor,
                  borderColor: `${roleConfig.primaryColor}40`,
                  borderWidth: '1px'
                }}
              >
                {roleConfig.badge}
              </span>
            </div>
            <div className="text-xs font-semibold text-white/80 mt-1 truncate">
              {roleConfig.label}
            </div>
          </div>
        )}

        {ALL_8_FEATURES.map((group, idx) => (
          <div key={idx} className="flex flex-col gap-0.5">
            {!isCollapsed ? (
              <div className="px-4 text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1 mt-1">
                {group.title}
              </div>
            ) : (
              <div className="h-px bg-white/[0.06] mx-4 mb-2 mt-1"></div>
            )}
            
            {group.items.map((item) => {
              const isRolePriority = item.role === activeRole;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `relative flex items-center justify-between mx-2.5 px-3 py-2 rounded-xl transition-all duration-200 text-[12px] font-medium ${
                      isActive 
                        ? 'font-bold shadow-md' 
                        : isRolePriority
                        ? 'text-white/80 hover:bg-white/[0.04] hover:text-white'
                        : 'text-white/50 hover:bg-white/[0.03] hover:text-white/80'
                    }`
                  }
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? `${roleConfig.primaryColor}20` : undefined,
                    color: isActive ? roleConfig.primaryColor : undefined,
                    borderColor: isActive ? `${roleConfig.primaryColor}50` : 'transparent',
                    borderWidth: '1px'
                  })}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="relative flex items-center justify-center flex-shrink-0">
                      <item.icon size={16} strokeWidth={1.8} />
                    </div>
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && isRolePriority && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase"
                      style={{
                        backgroundColor: `${roleConfig.primaryColor}25`,
                        color: roleConfig.primaryColor
                      }}
                    >
                      P1
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      {windowWidth >= 1024 && (
        <button
          className="w-full py-3 border-t border-white/[0.08] flex items-center justify-center text-white/50 hover:bg-white/[0.04] hover:text-white transition-colors cursor-pointer"
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
