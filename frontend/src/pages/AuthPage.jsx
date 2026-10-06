import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  KeyRound,
  MapPin,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import AmbientBackground from '../components/AmbientBackground';
import './AuthPage.css';

const PERSONAS = [
  {
    id: 'director',
    role: 'director',
    title: 'Regional Director',
    badge: 'Multi-City Oversight',
    city: 'Bangalore & Mumbai',
    description: 'Greenfield scouting, cannibalization governance, portfolio P&L'
  },
  {
    id: 'gm',
    role: 'gm',
    title: 'Dark Store GM',
    badge: 'Hub Operations',
    city: 'HSR Layout Sector 4',
    description: 'Sigmoid perishable markdowns, 10-min VRP rider dispatch'
  },
  {
    id: 'datascience',
    role: 'datascience',
    title: 'Supply Chain ML Engineer',
    badge: 'MLOps & Forecasting',
    city: 'All 5 Metros',
    description: 'XGBoost walk-forward models, drift monitoring, MLflow models'
  },
  {
    id: 'franchise',
    role: 'franchise',
    title: 'Franchise Network Partner',
    badge: 'Owner-Operator',
    city: 'Delhi-NCR & Pune',
    description: 'Unit economics, safety stock ROP, automated playbooks'
  }
];

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated, setRole } = useAuth();

  // Mode: 'login' | 'register' | 'forgot' | 'demo'
  const queryParams = new URLSearchParams(location.search);
  const initialMode = queryParams.get('mode') || 'login';
  const [authMode, setAuthMode] = useState(initialMode);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errors, setErrors] = useState({});

  const from = location.state?.from?.pathname || '/cockpit';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Auth Mutation
  const authMutation = useMutation({
    mutationFn: async (payload) => {
      if (authMode === 'login') {
        return await login({ email: payload.email, password: payload.password });
      } else if (authMode === 'register') {
        return await register({
          email: payload.email,
          password: payload.password,
          full_name: payload.fullName,
          organization: payload.organization
        });
      } else if (authMode === 'forgot') {
        return await api.forgotPassword(payload.email);
      }
    },
    onSuccess: (data) => {
      if (authMode === 'forgot') {
        setResetSent(true);
      } else {
        navigate(from, { replace: true });
      }
    },
    onError: (err) => {
      setErrors({ submit: err.message || 'Authentication failed. Please verify credentials.' });
    }
  });

  const validate = () => {
    const newErrors = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email address format';
    }

    if (authMode !== 'forgot') {
      if (!password) {
        newErrors.password = 'Password is required';
      } else if (password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
    }

    if (authMode === 'register') {
      if (!fullName) newErrors.fullName = 'Full name is required';
      if (!organization) newErrors.organization = 'Company or Hub name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    authMutation.mutate({ email, password, fullName, organization });
  };

  const handleLaunchDemoPersona = async (persona) => {
    // Generate simulated guest access for immediate sandbox testing
    try {
      const demoTokenData = {
        access_token: 'demo-token-' + persona.role + '-' + Date.now(),
        refresh_token: 'demo-refresh-' + Date.now(),
        user_id: '999',
        role: persona.role,
        email: persona.id + '@darkstori.demo'
      };
      // Synthetic base64 JWT payload with expiry in 24h
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = btoa(JSON.stringify({
        sub: persona.id + '@darkstori.demo',
        user_id: '999',
        role: persona.role,
        exp: Math.floor(Date.now() / 1000) + 86400
      }));
      const syntheticJwt = `${header}.${payload}.signature`;

      localStorage.setItem('auth_token', syntheticJwt);
      localStorage.setItem('refresh_token', demoTokenData.refresh_token);
      localStorage.setItem('darkstori_persona', JSON.stringify(persona));

      window.location.href = '/cockpit';
    } catch (e) {
      setErrors({ submit: 'Failed to initialize demo sandbox.' });
    }
  };

  return (
    <div className="auth-page-root">
      <AmbientBackground />

      {/* Top Bar */}
      <div className="auth-top-bar">
        <Link to="/" className="back-home-link">
          <ChevronLeft size={16} />
          <span>Back to Landing Page</span>
        </Link>
        <div className="auth-brand-badge">
          <span className="brand-dot-pulse" />
          <span>Darkstori Identity Gateway</span>
        </div>
      </div>

      <div className="auth-main-card-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="auth-glass-box"
        >
          {/* Header Switcher */}
          <div className="auth-tab-pill-bar">
            <button
              className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => { setAuthMode('login'); setErrors({}); }}
            >
              Sign In
            </button>
            <button
              className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => { setAuthMode('register'); setErrors({}); }}
            >
              Register Hub
            </button>
            <button
              className={`auth-tab-btn ${authMode === 'demo' ? 'active' : ''}`}
              onClick={() => { setAuthMode('demo'); setErrors({}); }}
            >
              <Sparkles size={14} className="sparkle-gold" />
              <span>1-Click Sandbox</span>
            </button>
          </div>

          {/* Mode 1: Sign In / Register / Forgot Password */}
          {authMode !== 'demo' && (
            <div className="auth-form-wrapper">
              <div className="auth-form-header">
                <h2>
                  {authMode === 'login' && 'Partner Portal Sign In'}
                  {authMode === 'register' && 'Onboard New Dark Store Hub'}
                  {authMode === 'forgot' && 'Reset Access Credentials'}
                </h2>
                <p>
                  {authMode === 'login' && 'Enter your credentials to access the prescriptive intelligence cockpit.'}
                  {authMode === 'register' && 'Create your enterprise partner account for hyperlocal network telemetry.'}
                  {authMode === 'forgot' && 'Enter your verified work email to receive password reset instructions.'}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {errors.submit && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="auth-error-banner"
                  >
                    <AlertCircle size={16} />
                    <span>{errors.submit}</span>
                  </motion.div>
                )}

                {resetSent && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="auth-success-banner"
                  >
                    <CheckCircle2 size={16} />
                    <span>Reset link sent to {email}. Check your inbox.</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="auth-inner-form">
                {authMode === 'register' && (
                  <>
                    <div className="auth-field">
                      <label>Full Name</label>
                      <div className="auth-input-wrap">
                        <User size={16} className="field-ico" />
                        <input
                          type="text"
                          placeholder="e.g. Aaditya Uniyal"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className={errors.fullName ? 'has-error' : ''}
                        />
                      </div>
                      {errors.fullName && <span className="err-txt">{errors.fullName}</span>}
                    </div>

                    <div className="auth-field">
                      <label>Organization / Dark Store Brand</label>
                      <div className="auth-input-wrap">
                        <Building2 size={16} className="field-ico" />
                        <input
                          type="text"
                          placeholder="e.g. Instamart Hub #4, Blinkit Partner"
                          value={organization}
                          onChange={(e) => setOrganization(e.target.value)}
                          className={errors.organization ? 'has-error' : ''}
                        />
                      </div>
                      {errors.organization && <span className="err-txt">{errors.organization}</span>}
                    </div>
                  </>
                )}

                <div className="auth-field">
                  <label>Work Email</label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="field-ico" />
                    <input
                      type="email"
                      placeholder="name@darkstore.io"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={errors.email ? 'has-error' : ''}
                    />
                  </div>
                  {errors.email && <span className="err-txt">{errors.email}</span>}
                </div>

                {authMode !== 'forgot' && (
                  <div className="auth-field">
                    <div className="field-header-row">
                      <label>Password</label>
                      {authMode === 'login' && (
                        <button
                          type="button"
                          onClick={() => setAuthMode('forgot')}
                          className="forgot-link"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="auth-input-wrap">
                      <Lock size={16} className="field-ico" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={errors.password ? 'has-error' : ''}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="eye-toggle"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && <span className="err-txt">{errors.password}</span>}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authMutation.isPending}
                  className="auth-submit-btn"
                >
                  {authMutation.isPending ? (
                    <span className="btn-loading">
                      <Loader2 size={16} className="spin" />
                      <span>Authenticating...</span>
                    </span>
                  ) : (
                    <span>
                      {authMode === 'login' && 'Sign In to Cockpit'}
                      {authMode === 'register' && 'Create Hub Account'}
                      {authMode === 'forgot' && 'Send Reset Link'}
                    </span>
                  )}
                </button>
              </form>

              {authMode === 'forgot' && (
                <div className="auth-form-footer">
                  <button onClick={() => setAuthMode('login')} className="back-login-btn">
                    Return to Sign In
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: 1-Click Instant Demo Sandbox Mode */}
          {authMode === 'demo' && (
            <div className="demo-persona-wrapper">
              <div className="demo-header">
                <div className="demo-badge">
                  <Sparkles size={14} />
                  <span>INSTANT ACCESS SANDBOX</span>
                </div>
                <h2>Select Your Operator Persona</h2>
                <p>Test drive Darkstori with full pre-seeded telemetry data for 5 Indian focus metros without registering an account.</p>
              </div>

              <div className="personas-list">
                {PERSONAS.map((p) => (
                  <div
                    key={p.id}
                    className={`persona-card ${selectedPersona.id === p.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPersona(p)}
                  >
                    <div className="persona-top">
                      <div className="persona-title-wrap">
                        <h4>{p.title}</h4>
                        <span className="persona-badge">{p.badge}</span>
                      </div>
                      <div className="persona-metro">
                        <MapPin size={12} />
                        <span>{p.city}</span>
                      </div>
                    </div>
                    <p className="persona-desc">{p.description}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchDemoPersona(p);
                      }}
                      className="persona-launch-btn"
                    >
                      <span>Launch as {p.title}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
