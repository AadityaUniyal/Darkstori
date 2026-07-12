import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';

const Dashboard        = lazy(() => import('./pages/Dashboard'));
const ResilienceCockpit = lazy(() => import('./pages/ResilienceCockpit'));
const Simulator        = lazy(() => import('./pages/Simulator'));
const Neighborhoods    = lazy(() => import('./pages/Neighborhoods'));
const Analytics        = lazy(() => import('./pages/Analytics'));
const Forecast         = lazy(() => import('./pages/Forecast'));
const AlgorithmLab     = lazy(() => import('./pages/AlgorithmLab'));
const Recommendations  = lazy(() => import('./pages/Recommendations'));
const LocalEvents      = lazy(() => import('./pages/LocalEvents'));
const Login            = lazy(() => import('./pages/Login'));
const NotFound         = lazy(() => import('./pages/NotFound'));

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import PrivateRoute from './components/PrivateRoute';
import RangoliLoader from './components/RangoliLoader';
import LiveSocketListener from './components/LiveSocketListener';
import { AuthProvider } from './context/AuthContext';
import { CityProvider } from './context/CityContext';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from 'sonner';

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
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.98,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

function AnimatedPage({ children }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  );
}

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return (
      <Suspense fallback={<RangoliLoader />}>
        <Routes location={location}>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div className="app">
      <Navbar />
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Suspense fallback={<RangoliLoader />}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/"              element={<PrivateRoute><AnimatedPage><Dashboard /></AnimatedPage></PrivateRoute>} />
                <Route path="/resilience"    element={<PrivateRoute><AnimatedPage><ResilienceCockpit /></AnimatedPage></PrivateRoute>} />
                <Route path="/simulator"     element={<PrivateRoute><AnimatedPage><Simulator /></AnimatedPage></PrivateRoute>} />
                <Route path="/neighborhoods" element={<PrivateRoute><AnimatedPage><Neighborhoods /></AnimatedPage></PrivateRoute>} />
                <Route path="/analytics"     element={<PrivateRoute><AnimatedPage><Analytics /></AnimatedPage></PrivateRoute>} />
                <Route path="/forecast"      element={<PrivateRoute><AnimatedPage><Forecast /></AnimatedPage></PrivateRoute>} />
                <Route path="/algorithm-lab" element={<PrivateRoute><AnimatedPage><AlgorithmLab /></AnimatedPage></PrivateRoute>} />
                <Route path="/recommendations" element={<PrivateRoute><AnimatedPage><Recommendations /></AnimatedPage></PrivateRoute>} />
                <Route path="/events"        element={<PrivateRoute><AnimatedPage><LocalEvents /></AnimatedPage></PrivateRoute>} />
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
    <ThemeProvider defaultTheme="dark" storageKey="darkstori-ui-theme">
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <CityProvider>
            <AuthProvider>
              <LiveSocketListener />
              <Toaster position="top-right" richColors />
              <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AppContent />
              </Router>
            </AuthProvider>
          </CityProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
