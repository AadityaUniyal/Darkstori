import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const RoleContext = createContext(null);

export const OPERATIONAL_ROLES = {
  EXECUTIVE: 'executive',
  STORE_GM: 'store-gm',
  FLEET_COMMANDER: 'fleet-commander',
};

export function RoleProvider({ children }) {
  const [activeRole, setActiveRoleState] = useState(() => {
    const saved = localStorage.getItem('darkstori_operational_lens') || OPERATIONAL_ROLES.EXECUTIVE;
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-role', saved);
    }
    return saved;
  });

  const setRole = useCallback((newRole) => {
    setActiveRoleState(newRole);
    localStorage.setItem('darkstori_operational_lens', newRole);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-role', newRole);
    }
    window.dispatchEvent(new CustomEvent('darkstori:role-change', { detail: { role: newRole } }));
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-role', activeRole);
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
    window.addEventListener('darkstori:role-change', handleExternalChange);
    return () => window.removeEventListener('darkstori:role-change', handleExternalChange);
  }, [activeRole]);

  return (
    <RoleContext.Provider value={{ activeRole, setRole, roles: OPERATIONAL_ROLES }}>
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
    };
  }
  return context;
}
