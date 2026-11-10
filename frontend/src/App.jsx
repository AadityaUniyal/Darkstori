import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

// Public & Core Pages
const LandingPage      = lazy(() => import('./pages/LandingPage'));
const AuthPage         = lazy(() => import('./pages/AuthPage'));
const NotFound         = lazy(() => import('./pages/NotFound'));
const PublicPassportVerification = lazy(() => import('./pages/PublicPassportVerification'));

// 8 Dedicated Flagship Production Features + Advanced Extensions
const ExpansionPage  = lazy(() => import('./features/expansion/ExpansionPage'));
const InventoryPage  = lazy(() => import('./features/inventory/InventoryPage'));
const FloorPage      = lazy(() => import('./features/floor/FloorPage'));
const DispatchPage   = lazy(() => import('./features/dispatch/DispatchPage'));
const CompetitorPage = lazy(() => import('./features/competitor/CompetitorPage'));
const PlaybooksPage  = lazy(() => import('./features/playbooks/PlaybooksPage'));
const EconomicsPage  = lazy(() => import('./features/economics/EconomicsPage'));
const VisionPage     = lazy(() => import('./features/vision/VisionPage'));
const NocPage        = lazy(() => import('./features/noc/NocPage'));
const PickerTerminalPage = lazy(() => import('./features/terminal/PickerTerminalPage'));
const PanIndiaDirectoryPage = lazy(() => import('./features/directory/PanIndiaDirectoryPage'));
const HolodeckPage   = lazy(() => import('./features/holodeck/HolodeckPage'));
const BenchmarksPage = lazy(() => import('./features/benchmarks/BenchmarksPage'));

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import PrivateRoute from './components/PrivateRoute';
import RangoliLoader from './components/RangoliLoader';
import LiveSocketListener from './components/LiveSocketListener';
import CommandPalette from './components/CommandPalette';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import ProductTourModal from './components/ProductTourModal';
import { useRole } from './context/RoleContext';
import { AuthProvider } from './context/AuthContext';
import { CityProvider } from './context/CityContext';
import { RoleProvider } from './context/RoleContext';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from 'sonner';

import GradientMesh from './components/GradientMesh';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      gcTime: 30 * 60 * 1000,
    },
  },
});

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] },
  },
};

function AnimatedPage({ children }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      variants={prefersReducedMotion ? undefined : pageVariants}
      initial={prefersReducedMotion ? false : 'initial'}
      animate={prefersReducedMotion ? undefined : 'animate'}
      exit={prefersReducedMotion ? undefined : 'exit'}
      className="w-full flex-1 flex flex-col items-center"
    >
      {children}
    </motion.div>
  );
}

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/auth' || location.pathname === '/register';
  const isLandingPage = location.pathname === '/' || location.pathname === '/welcome';
  const isVerifyPage = location.pathname.startsWith('/verify');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { setRole } = useRole();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        setRole('executive');
      } else if ((e.metaKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault();
        setRole('store-gm');
      } else if ((e.metaKey || e.ctrlKey) && e.key === '3') {
        e.preventDefault();
        setRole('fleet-commander');
      } else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    };
    const handleCustomOpen = () => setCommandPaletteOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('darkstor:open-command-palette', handleCustomOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('darkstor:open-command-palette', handleCustomOpen);
    };
  }, [setRole]);

  if (isLandingPage) {
    return (
      <Suspense fallback={<RangoliLoader />}>
        <AnimatePresence mode="wait">
          <AnimatedPage key="landing">
            <LandingPage />
          </AnimatedPage>
        </AnimatePresence>
      </Suspense>
    );
  }

  if (isVerifyPage) {
    return (
      <Suspense fallback={<RangoliLoader />}>
        <AnimatePresence mode="wait">
          <AnimatedPage key={location.pathname}>
            <Routes location={location}>
              <Route path="/verify" element={<PublicPassportVerification />} />
              <Route path="/verify/:passport_qr" element={<PublicPassportVerification />} />
            </Routes>
          </AnimatedPage>
        </AnimatePresence>
      </Suspense>
    );
  }

  if (isAuthPage) {
    return (
      <Suspense fallback={<RangoliLoader />}>
        <AnimatePresence mode="wait">
          <AnimatedPage key={location.pathname}>
            <Routes location={location}>
              <Route path="/login" element={<AuthPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/register" element={<AuthPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AnimatedPage>
        </AnimatePresence>
      </Suspense>
    );
  }

  return (
    <div className="app">
      <Navbar />
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ProductTourModal />
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Suspense fallback={<RangoliLoader />}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                {/* 8 Dedicated Flagship Features + NOC, Terminal & Pan-India Directory */}
                <Route path="/directory"   element={<PrivateRoute><AnimatedPage><PanIndiaDirectoryPage /></AnimatedPage></PrivateRoute>} />
                <Route path="/noc"         element={<PrivateRoute><AnimatedPage><NocPage /></AnimatedPage></PrivateRoute>} />
                <Route path="/holodeck"    element={<PrivateRoute><AnimatedPage><HolodeckPage /></AnimatedPage></PrivateRoute>} />
                <Route path="/terminal"    element={<PrivateRoute><AnimatedPage><PickerTerminalPage /></AnimatedPage></PrivateRoute>} />
                <Route path="/expansion"   element={<PrivateRoute><AnimatedPage><ExpansionPage /></AnimatedPage></PrivateRoute>} />
                <Route path="/inventory"   element={<PrivateRoute><AnimatedPage><InventoryPage /></AnimatedPage></PrivateRoute>} />
                <Route path="/floor"       element={<PrivateRoute><AnimatedPage><FloorPage /></AnimatedPage></PrivateRoute>} />
                <Route path="/dispatch"    element={<PrivateRoute><AnimatedPage><DispatchPage /></AnimatedPage></PrivateRoute>} />
                <Route path="/competitor"  element={<PrivateRoute><AnimatedPage><CompetitorPage /></AnimatedPage></PrivateRoute>} />
                <Route path="/playbooks"   element={<PrivateRoute><AnimatedPage><PlaybooksPage /></AnimatedPage></PrivateRoute>} />
                <Route path="/economics"   element={<PrivateRoute><AnimatedPage><EconomicsPage /></AnimatedPage></PrivateRoute>} />
                <Route path="/vision"      element={<PrivateRoute><AnimatedPage><VisionPage /></AnimatedPage></PrivateRoute>} />
                <Route path="/benchmarks"  element={<PrivateRoute><AnimatedPage><BenchmarksPage /></AnimatedPage></PrivateRoute>} />

                {/* Seamless Legacy Workspaces & Aliases */}
                <Route path="/dashboard"     element={<Navigate to="/expansion" replace />} />
                <Route path="/cockpit"       element={<Navigate to="/expansion" replace />} />
                <Route path="/network"       element={<Navigate to="/dispatch" replace />} />
                <Route path="/vision-pack"   element={<Navigate to="/vision" replace />} />
                <Route path="/resilience"    element={<Navigate to="/playbooks" replace />} />
                <Route path="/simulator"     element={<Navigate to="/expansion" replace />} />
                <Route path="/neighborhoods" element={<Navigate to="/expansion" replace />} />
                <Route path="/analytics"     element={<Navigate to="/economics" replace />} />
                <Route path="/forecast"      element={<Navigate to="/inventory" replace />} />
                <Route path="/recommendations" element={<Navigate to="/inventory" replace />} />
                
                <Route path="/not-found"     element={<AnimatedPage><NotFound /></AnimatedPage>} />
                <Route path="*"              element={<Navigate to="/not-found" replace />} />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="darkstor-ui-theme">
      <GradientMesh />
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <CityProvider>
            <RoleProvider>
              <AuthProvider>
                <LiveSocketListener />
                <Toaster position="top-right" richColors />
                <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <AppContent />
                </Router>
              </AuthProvider>
            </RoleProvider>
          </CityProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
