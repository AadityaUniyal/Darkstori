import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const RoleContext = createContext(null);

export const OPERATIONAL_ROLES = {
  EXECUTIVE: 'executive',
  STORE_GM: 'store-gm',
  FLEET_COMMANDER: 'fleet-commander',
};

export const ROLE_CONFIGS = {
  [OPERATIONAL_ROLES.EXECUTIVE]: {
    id: 'executive',
    label: 'Executive Lens',
    title: 'Network & Capital Strategist',
    badge: 'C-Suite',
    primaryColor: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.25)',
    allowedTabs: ['/expansion', '/economics', '/competitor', '/playbooks', '/dashboard'],
    firstTimeTitle: 'Executive Portfolio Calibration',
    firstTimeDesc: 'Welcome to DarkStori Executive Suite. Calibrate city expansion targets, CapEx payback thresholds, and risk bounds.',
    returningTitle: 'Executive Morning Briefing',
    returningDesc: 'Overnight GMV delta, portfolio EBITDA margin variance, and competitor encroachment alerts.',
  },
  [OPERATIONAL_ROLES.STORE_GM]: {
    id: 'store-gm',
    label: 'Store GM Lens',
    title: 'Inside-The-4-Walls Commander',
    badge: 'Operations',
    primaryColor: '#8B5CF6',
    accentGlow: 'rgba(139, 92, 246, 0.25)',
    allowedTabs: ['/floor', '/inventory', '/vision', '/playbooks', '/dashboard'],
    firstTimeTitle: 'Dark Store Digital Twin Setup',
    firstTimeDesc: 'Configure physical racking geometry, Golden Zone shelf slotting, and packing station tolerances.',
    returningTitle: 'Shift Handover Telemetry',
    returningDesc: 'Active pick-to-bag cycle times, cold-chain temperature status, and urgent replenishment POs.',
  },
  [OPERATIONAL_ROLES.FLEET_COMMANDER]: {
    id: 'fleet-commander',
    label: 'Fleet Commander Lens',
    title: 'Last-Mile Swarm Dispatcher',
    badge: 'Logistics',
    primaryColor: '#10B981',
    accentGlow: 'rgba(16, 185, 129, 0.25)',
    allowedTabs: ['/dispatch', '/playbooks', '/expansion', '/economics', '/dashboard'],
    firstTimeTitle: 'Fleet Geofence Calibration',
    firstTimeDesc: 'Define maximum 10-minute delivery radiuses, rider pool constraints, and waterlogged avoidance zones.',
    returningTitle: 'Live Swarm Command',
    returningDesc: 'Real-time order batching queue, active rider SLA countdowns, and weather disruption overrides.',
  },
};

export function RoleProvider({ children }) {
  const [activeRole, setActiveRoleState] = useState(() => {
    const saved = localStorage.getItem('darkstor_operational_lens') || OPERATIONAL_ROLES.EXECUTIVE;
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-role', saved);
    }
    return saved;
  });

  const [firstTimeFlags, setFirstTimeFlags] = useState(() => {
    try {
      const saved = localStorage.getItem('darkstor_first_time_flags');
      return saved ? JSON.parse(saved) : { executive: false, 'store-gm': false, 'fleet-commander': false };
    } catch {
      return { executive: false, 'store-gm': false, 'fleet-commander': false };
    }
  });

  const setRole = useCallback((newRole) => {
    setActiveRoleState(newRole);
    localStorage.setItem('darkstor_operational_lens', newRole);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-role', newRole);
    }
    window.dispatchEvent(new CustomEvent('darkstor:role-change', { detail: { role: newRole } }));
  }, []);

  const toggleFirstTimeUserMode = useCallback(() => {
    setFirstTimeFlags((prev) => {
      const updated = { ...prev, [activeRole]: !prev[activeRole] };
      localStorage.setItem('darkstor_first_time_flags', JSON.stringify(updated));
      return updated;
    });
  }, [activeRole]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-role', activeRole);
      const conf = ROLE_CONFIGS[activeRole];
      if (conf) {
        document.documentElement.style.setProperty('--role-primary', conf.primaryColor);
        document.documentElement.style.setProperty('--role-glow', conf.accentGlow);
      }
    }
  }, [activeRole]);

  useEffect(() => {
    const handleExternalChange = (e) => {
      if (e.detail?.role && e.detail.role !== activeRole) {
        setActiveRoleState(e.detail.role);
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-role', e.detail.role);
        }
      }
    };
    window.addEventListener('darkstor:role-change', handleExternalChange);
    return () => window.removeEventListener('darkstor:role-change', handleExternalChange);
  }, [activeRole]);

  const currentRoleConfig = useMemo(() => ROLE_CONFIGS[activeRole] || ROLE_CONFIGS[OPERATIONAL_ROLES.EXECUTIVE], [activeRole]);
  const isFirstTimeForActiveRole = Boolean(firstTimeFlags[activeRole]);

  return (
    <RoleContext.Provider
      value={{
        activeRole,
        setRole,
        roles: OPERATIONAL_ROLES,
        roleConfig: currentRoleConfig,
        allRoleConfigs: ROLE_CONFIGS,
        isFirstTimeUser: isFirstTimeForActiveRole,
        toggleFirstTimeUserMode,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    return {
      activeRole: OPERATIONAL_ROLES.EXECUTIVE,
      setRole: () => {},
      roles: OPERATIONAL_ROLES,
      roleConfig: ROLE_CONFIGS[OPERATIONAL_ROLES.EXECUTIVE],
      allRoleConfigs: ROLE_CONFIGS,
      isFirstTimeUser: false,
      toggleFirstTimeUserMode: () => {},
    };
  }
  return context;
}
