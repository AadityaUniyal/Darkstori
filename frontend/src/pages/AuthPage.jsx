import React, { useState, useEffect } from 'react';
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
  Check,
  Compass,
  Layers,
  Truck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { api } from '../services/api';
import AmbientBackground from '../components/AmbientBackground';
import './AuthPage.css';

const UNIFIED_PERSONAS = [
  {
    id: 'executive',
    role: 'executive',
    title: 'Executive / Expansion Director',
    badge: 'Cupertino Sapphire & Gold',
    city: 'All 5 Metros',
    icon: Compass,
    accentColor: '#0071E3',
    targetRoute: '/cockpit',
    description: 'Greenfield scouting, competitor Huff gravity displacement, CapEx & breakeven models, portfolio ROI.'
  },
  {
    id: 'store-gm',
    role: 'store-gm',
    title: 'Dark Store General Manager',
    badge: 'Industrial Saffron & Emerald',
    city: 'HSR Layout & Indiranagar',
    icon: Layers,
    accentColor: '#FF9F1C',
    targetRoute: '/floor',
    description: 'Sub-120s dispatch cadence, single-pass TSP picker routing, Golden Zone slotting, Sigmoid zero-waste.'
  },
  {
    id: 'fleet-commander',
    role: 'fleet-commander',
    title: 'Fleet Commander / NOC Chief',
    badge: 'Tactical Cyber Cyan & Crimson',
    city: 'NOC War Room (5 Cities)',
    icon: Truck,
    accentColor: '#00F0FF',
    targetRoute: '/dashboard',
    description: '10-minute SLA radar, Clarke-Wright multi-drop VRP dispatch, live Doppler monsoon flood protection.'
  }
];

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated, demoLogin } = useAuth();
  const { setRole: setGlobalRole } = useRole();

  const queryParams = new URLSearchParams(location.search);
  const initialMode = location.pathname === '/register' || queryParams.get('mode') === 'register' ? 'register' : (queryParams.get('mode') || 'demo');
  const initialRoleParam = queryParams.get('role');
  
  const [authMode, setAuthMode] = useState(initialMode);
  const [selectedRole, setSelectedRole] = useState(initialRoleParam || 'executive');
  const [selectedCity, setSelectedCity] = useState('Bangalore');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errors, setErrors] = useState({});
  const [onboardingSuccess, setOnboardingSuccess] = useState(null);

  useEffect(() => {
    if (isAuthenticated && !onboardingSuccess) {
      const target = selectedRole === 'store-gm' ? '/floor' : selectedRole === 'fleet-commander' ? '/dashboard' : '/cockpit';
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, navigate, selectedRole, onboardingSuccess]);

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
          organization: payload.organization,
          city: payload.city,
          role: payload.role
        });
      } else if (authMode === 'forgot') {
        return await api.forgotPassword(payload.email);
      }
    },
    onSuccess: (data) => {
      setGlobalRole(selectedRole);
      if (authMode === 'forgot') {
        setResetSent(true);
      } else if (authMode === 'register') {
        setOnboardingSuccess({
          fullName,
          organization,
          city: selectedCity,
          role: selectedRole,
          targetRoute: selectedRole === 'store-gm' ? '/floor' : selectedRole === 'fleet-commander' ? '/dashboard' : '/cockpit'
        });
      } else {
        const target = selectedRole === 'store-gm' ? '/floor' : selectedRole === 'fleet-commander' ? '/dashboard' : '/cockpit';
        navigate(target, { replace: true });
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

    if (authMode === 'register') {
      if (!fullName.trim()) newErrors.fullName = 'Full name is required';
      if (!organization.trim()) newErrors.organization = 'Company / Network name is required';
      if (!password) {
        newErrors.password = 'Password is required';
      } else if (password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
    } else if (authMode === 'login') {
      if (!password) {
        newErrors.password = 'Password is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    authMutation.mutate({
      email,
      password,
      fullName,
      organization,
      city: selectedCity,
      role: selectedRole
    });
  };

  const handleLaunchPersona = async (persona) => {
    try {
      setGlobalRole(persona.role);
      await demoLogin({
        id: persona.id,
        role: persona.role,
        title: persona.title,
        city: persona.city
      });
      navigate(persona.targetRoute, { replace: true });
    } catch (e) {
      setErrors({ submit: e?.message || 'Failed to initialize operator session.' });
    }
  };

  return (
    <div className="auth-page-root">
      <AmbientBackground />

      {/* Top Bar */}
      <div className="auth-top-bar">
        <Link to="/" className="back-home-link">
          <ChevronLeft size={16} />
          <span>Back to Product Story</span>
        </Link>
        <div className="auth-brand-badge">
          <span className="brand-dot-pulse" />
          <span>Darkstori Identity Gateway 5.0</span>
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
              Returning Operator
            </button>
            <button
              className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => { setAuthMode('register'); setErrors({}); }}
            >
              New Hub Provisioning
            </button>
            <button
              className={`auth-tab-btn ${authMode === 'demo' ? 'active' : ''}`}
              onClick={() => { setAuthMode('demo'); setErrors({}); }}
            >
              <Sparkles size={14} className="sparkle-gold" />
              <span>Fast-Pass Roles</span>
            </button>
          </div>

          {/* NEW USER ONBOARDING SUCCESS MODAL */}
          {onboardingSuccess && (
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/40">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white">Hub Successfully Provisioned!</h2>
              <p className="text-sm text-white/70 max-w-md mx-auto">
                Welcome <strong className="text-white">{onboardingSuccess.fullName}</strong>. Your organization <strong className="text-white">{onboardingSuccess.organization}</strong> has been calibrated for the <strong className="text-[#FFB703]">{onboardingSuccess.city}</strong> market.
              </p>
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-left max-w-sm mx-auto space-y-2">
                <div className="flex justify-between text-white/60">
                  <span>Assigned Operational Lens:</span>
                  <span className="text-white font-bold uppercase">{onboardingSuccess.role}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Primary Workspace:</span>
                  <span className="text-[#00F0FF] font-bold">{onboardingSuccess.targetRoute}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Theme Active:</span>
                  <span className="text-emerald-400 font-bold">Autonomous Dynamic Color</span>
                </div>
              </div>
              <button
                onClick={() => navigate(onboardingSuccess.targetRoute, { replace: true })}
                className="w-full max-w-sm mx-auto py-3 rounded-xl bg-gradient-to-r from-[#FF9F1C] to-[#FFB703] text-black font-bold text-xs tracking-wide shadow-lg shadow-[#FF9F1C]/25 flex items-center justify-center gap-2"
              >
                <span>Enter Tailored Workspace</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* STANDARD SIGN IN / REGISTER FORM */}
          {!onboardingSuccess && authMode !== 'demo' && (
            <div className="auth-form-wrapper">
              <div className="auth-form-header">
                <h2>
                  {authMode === 'login' && 'Sign In to Darkstori'}
                  {authMode === 'register' && 'Provision Enterprise Hub'}
                  {authMode === 'forgot' && 'Reset Access Credentials'}
                </h2>
                <p>
                  {authMode === 'login' && 'Enter your credentials to resume your dark store operational shift.'}
                  {authMode === 'register' && 'Configure organization details, primary focus metro, and operational lens.'}
                  {authMode === 'forgot' && 'We will send a password reset verification link to your email.'}
                </p>
              </div>

              {errors.submit && (
                <div className="auth-error-banner">
                  <AlertCircle size={16} />
                  <span>{errors.submit}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form-fields">
                {authMode === 'register' && (
                  <>
                    <div className="input-group-row">
                      <div className="input-wrap">
                        <label>Full Name</label>
                        <div className="input-with-icon">
                          <User size={16} className="field-icon" />
                          <input
                            type="text"
                            placeholder="e.g. Aaditya Uniyal"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                          />
                        </div>
                        {errors.fullName && <span className="field-error">{errors.fullName}</span>}
                      </div>

                      <div className="input-wrap">
                        <label>Company / Hub Name</label>
                        <div className="input-with-icon">
                          <Building2 size={16} className="field-icon" />
                          <input
                            type="text"
                            placeholder="e.g. Zepto Partner Network"
                            value={organization}
                            onChange={(e) => setOrganization(e.target.value)}
                          />
                        </div>
                        {errors.organization && <span className="field-error">{errors.organization}</span>}
                      </div>
                    </div>

                    <div className="input-group-row">
                      <div className="input-wrap">
                        <label>Primary Focus Metro</label>
                        <select
                          value={selectedCity}
                          onChange={(e) => setSelectedCity(e.target.value)}
                          className="w-full bg-[#0a0f18] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0071E3]"
                        >
                          <option value="Bangalore">Bangalore (HSR, Indiranagar, Whitefield)</option>
                          <option value="Mumbai">Mumbai (Bandra West, Andheri East, BKC)</option>
                          <option value="Delhi">Delhi-NCR (Saket, Hauz Khas, Gurugram)</option>
                          <option value="Hyderabad">Hyderabad (Gachibowli, Hitec City)</option>
                          <option value="Pune">Pune (Kothrud, Baner, Viman Nagar)</option>
                        </select>
                      </div>

                      <div className="input-wrap">
                        <label>Operational Role Lens</label>
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="w-full bg-[#0a0f18] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0071E3]"
                        >
                          <option value="executive">Executive (Expansion, CapEx & ROI)</option>
                          <option value="store-gm">Store GM (Floor Throughput & Zero-Waste)</option>
                          <option value="fleet-commander">Fleet Commander (10-Min VRP SLA Radar)</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div className="input-wrap">
                  <label>Work Email</label>
                  <div className="input-with-icon">
                    <Mail size={16} className="field-icon" />
                    <input
                      type="email"
                      placeholder="operator@darkstori.io"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {errors.email && <span className="field-error">{errors.email}</span>}
                </div>

                {authMode !== 'forgot' && (
                  <div className="input-wrap">
                    <label>Password</label>
                    <div className="input-with-icon">
                      <Lock size={16} className="field-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && <span className="field-error">{errors.password}</span>}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authMutation.isPending}
                  className="auth-submit-btn"
                >
                  {authMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <span>
                      {authMode === 'login' && 'Sign In to Workspace'}
                      {authMode === 'register' && 'Deploy & Enter Hub'}
                      {authMode === 'forgot' && 'Send Reset Instructions'}
                    </span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* FAST-PASS ROLES MODE */}
          {!onboardingSuccess && authMode === 'demo' && (
            <div className="p-6 space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-white">Instant Role Fast-Pass</h3>
                <p className="text-xs text-white/60 mt-1">
                  Experience Darkstori instantly through verified persona credentials with dedicated telemetry.
                </p>
              </div>

              <div className="space-y-3">
                {UNIFIED_PERSONAS.map((persona) => {
                  const Icon = persona.icon;
                  return (
                    <div
                      key={persona.id}
                      onClick={() => handleLaunchPersona(persona)}
                      className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${persona.accentColor}20`, color: persona.accentColor }}
                        >
                          <Icon size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white group-hover:text-amber-400 transition-colors">
                              {persona.title}
                            </span>
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-mono"
                              style={{ backgroundColor: `${persona.accentColor}15`, color: persona.accentColor }}
                            >
                              {persona.city}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/50 mt-0.5 max-w-md line-clamp-1">
                            {persona.description}
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-white/40 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 text-center">
                <button
                  onClick={() => setAuthMode('login')}
                  className="text-xs text-white/50 hover:text-white underline transition-colors"
                >
                  Return to email / password sign in
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
