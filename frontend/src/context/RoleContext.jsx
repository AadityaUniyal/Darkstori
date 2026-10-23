import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const RoleContext = createContext(null);

export const OPERATIONAL_ROLES = {
  EXECUTIVE: 'executive',
  STORE_GM: 'store-gm',
  FLEET_COMMANDER: 'fleet-commander',
};

export function RoleProvider({ children }) {
  const [activeRole, setActiveRoleState] = useState(() => {
    return localStorage.getItem('darkstori_operational_lens') || OPERATIONAL_ROLES.EXECUTIVE;
  });

  const setRole = useCallback((newRole) => {
    setActiveRoleState(newRole);
    localStorage.setItem('darkstori_operational_lens', newRole);
    window.dispatchEvent(new CustomEvent('darkstori:role-change', { detail: { role: newRole } }));
  }, []);

  useEffect(() => {
    const handleExternalChange = (e) => {
      if (e.detail?.role && e.detail.role !== activeRole) {
        setActiveRoleState(e.detail.role);
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
    // Graceful fallback if consumed outside provider
    return {
      activeRole: OPERATIONAL_ROLES.EXECUTIVE,
      setRole: () => {},
      roles: OPERATIONAL_ROLES,
    };
  }
  return context;
}
