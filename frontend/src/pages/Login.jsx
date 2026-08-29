import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle, Loader2, BarChart3, Map, LineChart, Percent, ArrowDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AmbientBackground from '../components/AmbientBackground';
import './Login.css';

const LiveAnalyticsCard = () => (
  <div className="glass-card feature-showcase-card" style={{ padding: '24px', width: '100%', height: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--color-border)', borderRadius: '16px', background: 'rgba(18, 19, 28, 0.75)', backdropFilter: 'blur(12px)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Live WebSocket Stream</span>
      </div>
      <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
        +24% SLA Compliance
      </span>
    </div>
    <svg width="100%" height="150" viewBox="0 0 400 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="liveGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--peacock-500)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--peacock-500)" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <rect x="20" y="80" width="16" height="50" rx="3" fill="rgba(255,255,255,0.1)" />
      <rect x="50" y="50" width="16" height="80" rx="3" fill="rgba(255,255,255,0.15)" />
      <rect x="80" y="30" width="16" height="100" rx="3" fill="var(--peacock-500)" opacity="0.6" />
      <rect x="110" y="60" width="16" height="70" rx="3" fill="rgba(255,255,255,0.1)" />
      <rect x="140" y="20" width="16" height="110" rx="3" fill="var(--peacock-500)" opacity="0.8" />
      <rect x="170" y="45" width="16" height="85" rx="3" fill="rgba(255,255,255,0.15)" />
      <path d="M 20 90 Q 70 30, 120 70 T 220 30 T 320 60 T 380 20 L 380 130 L 20 130 Z" fill="url(#liveGradient)" />
      <path d="M 20 90 Q 70 30, 120 70 T 220 30 T 320 60 T 380 20" stroke="var(--peacock-500)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="380" cy="20" r="5" fill="var(--peacock-500)" />
      <circle cx="380" cy="20" r="9" stroke="var(--peacock-500)" strokeWidth="1.5" opacity="0.5" />
    </svg>
  </div>
);

const GeospatialMappingCard = () => (
  <div className="glass-card feature-showcase-card" style={{ padding: '24px', width: '100%', height: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--color-border)', borderRadius: '16px', background: 'rgba(18, 19, 28, 0.75)', backdropFilter: 'blur(12px)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>PostGIS ClusterDBSCAN</span>
      <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
        Greenfield Radius: 2.4 km
      </span>
    </div>
    <svg width="100%" height="160" viewBox="0 0 400 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="200" cy="80" r="70" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
      <circle cx="200" cy="80" r="45" stroke="var(--peacock-500)" strokeOpacity="0.4" strokeDasharray="3 3" />
      <circle cx="200" cy="80" r="20" stroke="var(--peacock-500)" strokeOpacity="0.8" />
      <circle cx="200" cy="80" r="4" fill="var(--peacock-500)" />
      
      {/* Cluster Nodes */}
      <circle cx="140" cy="50" r="6" fill="#f59e0b" opacity="0.8" />
      <circle cx="160" cy="40" r="4" fill="#f59e0b" opacity="0.6" />
      <circle cx="130" cy="65" r="5" fill="#f59e0b" opacity="0.9" />
      
      <circle cx="260" cy="110" r="7" fill="#3b82f6" opacity="0.8" />
      <circle cx="275" cy="120" r="5" fill="#3b82f6" opacity="0.6" />
      <circle cx="245" cy="125" r="4" fill="#3b82f6" opacity="0.7" />
      
      <path d="M 200 80 L 260 110" stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" />
      <path d="M 200 80 L 140 50" stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" />
    </svg>
  </div>
);

const DemandForecastingCard = () => (
  <div className="glass-card feature-showcase-card" style={{ padding: '24px', width: '100%', height: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--color-border)', borderRadius: '16px', background: 'rgba(18, 19, 28, 0.75)', backdropFilter: 'blur(12px)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>XGBoost Demand Time-Series</span>
      <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
        MAPE: 6.42%
      </span>
    </div>
    <svg width="100%" height="160" viewBox="0 0 400 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Confidence interval band */}
      <path d="M 20 100 Q 100 40, 180 80 T 340 30 L 380 50 L 380 110 L 340 90 T 180 120 T 20 130 Z" fill="url(#forecastBand)" />
      {/* Actual curve */}
      <path d="M 20 110 Q 100 60, 180 95 T 340 50 L 380 70" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeDasharray="4 4" fill="none" />
      {/* Predicted curve */}
      <path d="M 20 105 Q 100 50, 180 88 T 340 40 L 380 60" stroke="#a855f7" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="340" cy="40" r="4" fill="#a855f7" />
    </svg>
  </div>
);

const SigmoidMarkdownCard = () => (
  <div className="glass-card feature-showcase-card" style={{ padding: '24px', width: '100%', height: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--color-border)', borderRadius: '16px', background: 'rgba(18, 19, 28, 0.75)', backdropFilter: 'blur(12px)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Sigmoid Salvage Pricing Decay</span>
      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
        Zero-Waste Target
      </span>
    </div>
    <svg width="100%" height="160" viewBox="0 0 400 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="decayGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      {/* Sigmoid curve */}
      <path d="M 20 30 C 140 30, 160 130, 380 130" stroke="url(#decayGrad)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <circle cx="100" cy="31" r="5" fill="#22c55e" />
      <circle cx="200" cy="80" r="5" fill="#f59e0b" />
      <circle cx="300" cy="128" r="5" fill="#ef4444" />
      {/* Step annotations */}
      <line x1="20" y1="140" x2="380" y2="140" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <text x="30" y="155" fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="sans-serif">Fresh (100%)</text>
      <text x="180" y="155" fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="sans-serif">Markdown T-12h</text>
      <text x="310" y="155" fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="sans-serif">Salvage (15%)</text>
    </svg>
  </div>
);

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [successChecked, setSuccessChecked] = useState(false);

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      if (successChecked) {
        const timer = setTimeout(() => {
          navigate(from, { replace: true });
        }, 600);
        return () => clearTimeout(timer);
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, navigate, from, successChecked]);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      if (isLogin) {
        return await login({ email: payload.email, password: payload.password });
      } else {
        return await register({ email: payload.email, password: payload.password, full_name: payload.fullName });
      }
    },
    onSuccess: () => {
      setSuccessChecked(true);
    },
    onError: (err) => {
      setErrors({ submit: err.message || 'Authentication failed. Please try again.' });
    }
  });

  const validate = () => {
    const newErrors = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!isLogin && !fullName) {
      newErrors.fullName = 'Full name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({ email, password, fullName });
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setEmail('');
    setPassword('');
    setFullName('');
  };

  const features = [
    {
      icon: <BarChart3 className="feature-icon-glow" />,
      title: "Real-time Live Analytics",
      description: "Zero-polling live feed backed by PostgreSQL triggers and WebSockets. Monitor active rider metrics, competitive movements, and SLA statuses as they happen.",
      Component: LiveAnalyticsCard
    },
    {
      icon: <Map className="feature-icon-glow" />,
      title: "Geospatial Intelligence",
      description: "PostGIS-powered Greenfield store locator. Identifies demographic opportunity clusters via ST_ClusterDBSCAN and evaluates local competitive saturation.",
      Component: GeospatialMappingCard
    },
    {
      icon: <LineChart className="feature-icon-glow" />,
      title: "XGBoost Demand Forecasting",
      description: "Time-series load forecasting using historical metrics, local holidays, and real-time weather alerts. Validated with walk-forward temporal splits.",
      Component: DemandForecastingCard
    },
    {
      icon: <Percent className="feature-icon-glow" />,
      title: "Zero-Waste Sigmoid Markdown",
      description: "Dynamic pricing decay algorithms to maximize perishable salvage value. Recommends continuous markdown rates based on remaining shelf life.",
      Component: SigmoidMarkdownCard
    }
  ];

  return (
    <div className="login-landing-container">
      <AmbientBackground />
      
      {/* Landing / Showcase Scrollable Area */}
      <div className="showcase-scroll-section">
        {/* Hero Section */}
        <section className="hero-landing-pane">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="hero-pane-content"
          >
            <h1 className="hero-wordmark">
              Darkstori<span className="saffron-dot">.</span>
            </h1>
            <p className="hero-subtitle">
              Enterprise-grade Hyperlocal Intelligence & Prescriptive Automation for Quick Commerce Dark Stores.
            </p>
            <div className="scroll-indicator-wrap">
              <span className="scroll-text">Scroll Down to Discover Features</span>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <ArrowDown size={18} className="scroll-arrow" />
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Feature Reveal List */}
        <div className="features-showcase-list">
          {features.map((feature, idx) => (
            <section key={idx} className="feature-showcase-pane">
              <div className="feature-showcase-text">
                <div className="feature-header-row">
                  {feature.icon}
                  <h2>{feature.title}</h2>
                </div>
                <p>{feature.description}</p>
              </div>
              <div className="feature-showcase-image-container">
                <feature.Component />
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Persistent / Floating Login Form */}
      <div className="login-sidebar-section">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`login-card ${errors.submit ? 'shake-card' : ''}`}
        >
          <div className="login-brand-header">
            <h2 className="brand-wordmark">
              Partner Portal<span className="saffron-dot">.</span>
            </h2>
            <p className="brand-tagline">
              Sign in to manage and optimize dark store parameters.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {errors.submit && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="login-error-banner"
              >
                <AlertCircle size={16} />
                <span>{errors.submit}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="login-form">
            {!isLogin && (
              <div className="login-field">
                <label className="login-label" htmlFor="fullName">Full Name</label>
                <div className="input-with-icon">
                  <User size={18} className="field-icon" />
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Aaditya Uniyal"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={errors.fullName ? 'input-error' : ''}
                  />
                </div>
                {errors.fullName && <span className="field-error-text">{errors.fullName}</span>}
              </div>
            )}

            <div className="login-field">
              <label className="login-label" htmlFor="email">Work Email</label>
              <div className="input-with-icon">
                <Mail size={18} className="field-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="name@darkstori.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? 'input-error' : ''}
                />
              </div>
              {errors.email && <span className="field-error-text">{errors.email}</span>}
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="password">Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="field-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={errors.password ? 'input-error' : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle-btn"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className="field-error-text">{errors.password}</span>}
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="login-submit-btn"
            >
              {mutation.isPending ? (
                <span className="btn-loading-state">
                  <Loader2 size={18} className="spinner-icon" />
                  {isLogin ? 'Signing In...' : 'Registering...'}
                </span>
              ) : (
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>

          <div className="login-footer">
            <span className="toggle-prompt">
              {isLogin ? "Don't have an account?" : "Already registered?"}
            </span>
            <button type="button" onClick={toggleMode} className="toggle-mode-btn">
              {isLogin ? 'Register Partner' : 'Sign In'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
