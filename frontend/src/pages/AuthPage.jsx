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
  MapPin,
  Clock,
  Bike,
  Compass,
  Layers,
  Truck,
  Check,
  Store
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { useCity } from '../context/CityContext';
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
    accentColor: '#F59E0B',
    targetRoute: '/expansion',
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
    badge: 'Last-Mile Swarm Fleet',
    city: 'NOC War Room (5 Cities)',
    icon: Truck,
    accentColor: '#10B981',
    targetRoute: '/dispatch',
    description: '10-minute SLA radar, Clarke-Wright multi-drop VRP dispatch, live Doppler monsoon flood protection.'
  }
];

const METRO_CITIES = [
  { name: 'Bangalore', localities: 'Indiranagar, HSR Layout, Koramangala, Whitefield', defaultPin: '560038' },
  { name: 'Mumbai', localities: 'Bandra West, Andheri East, BKC, Powai', defaultPin: '400050' },
  { name: 'Delhi', localities: 'Saket, Hauz Khas, Gurugram Phase 5, Noida Sector 62', defaultPin: '110017' },
  { name: 'Hyderabad', localities: 'Gachibowli, Hitec City, Madhapur, Jubilee Hills', defaultPin: '500081' },
  { name: 'Chennai', localities: 'T. Nagar, Adyar, Velachery, OMR Tech Corridor', defaultPin: '600020' },
  { name: 'Kolkata', localities: 'Salt Lake Sector V, New Town, Park Street', defaultPin: '700091' },
  { name: 'Pune', localities: 'Kothrud, Baner, Viman Nagar, Hinjewadi', defaultPin: '411038' },
  { name: 'Jaipur', localities: 'Malviya Nagar, Vaishali Nagar, C-Scheme', defaultPin: '302017' },
  { name: 'Lucknow', localities: 'Gomti Nagar, Hazratganj, Aliganj', defaultPin: '226010' },
  { name: 'Chandigarh', localities: 'Sector 17, Sector 35, Mohali Phase 7', defaultPin: '160017' },
  { name: 'Kochi', localities: 'Kakkanad Infopark, Panampilly Nagar, Edappally', defaultPin: '682030' },
];

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated, demoLogin } = useAuth();
  const { setRole: setGlobalRole } = useRole();
  const { setSelectedCity: setGlobalCity } = useCity();

  const queryParams = new URLSearchParams(location.search);
  const initialMode = location.pathname === '/register' || queryParams.get('mode') === 'register' ? 'register' : (queryParams.get('mode') || 'login');
  const initialRoleParam = queryParams.get('role');
  
  const [authMode, setAuthMode] = useState(initialMode);
  const [selectedRole, setSelectedRole] = useState(initialRoleParam || 'executive');
  const [selectedCity, setSelectedCity] = useState('Bangalore');

  // Input Fields for New Users & Returning Users
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [storeName, setStoreName] = useState('');
  const [pincode, setPincode] = useState('560038');
  const [targetSla, setTargetSla] = useState('10m');
  const [fleetSize, setFleetSize] = useState('12');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [onboardingSuccess, setOnboardingSuccess] = useState(null);

  // Automatically adjust default PIN and Pod Name when city changes
  const handleCityChange = (newCity) => {
    setSelectedCity(newCity);
    const meta = METRO_CITIES.find(c => c.name === newCity);
    if (meta) {
      setPincode(meta.defaultPin);
      if (!storeName || storeName.includes('Pod')) {
        setStoreName(`DarkStori - ${newCity} Pod 01`);
      }
    }
  };

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
          role: payload.role,
          store_name: payload.storeName,
          pincode: payload.pincode,
          sla: payload.sla,
          fleet: parseInt(payload.fleet, 10) || 12
        });
      }
    },
    onSuccess: (data) => {
      setGlobalRole(selectedRole);
      setGlobalCity(selectedCity);
      if (authMode === 'register') {
        setOnboardingSuccess({
          fullName,
          organization: organization || 'DarkStori Hub Network',
          storeName: storeName || `DarkStori - ${selectedCity} Pod 01`,
          city: selectedCity,
          pincode,
          sla: targetSla,
          fleet: fleetSize,
          role: selectedRole,
          targetRoute: selectedRole === 'store-gm' ? '/floor' : selectedRole === 'fleet-commander' ? '/dispatch' : '/expansion'
        });
      } else {
        const target = selectedRole === 'store-gm' ? '/floor' : selectedRole === 'fleet-commander' ? '/dispatch' : '/expansion';
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
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Enter a valid email (e.g. operator@darkstori.com)';
    }

    if (authMode === 'register') {
      if (!fullName.trim()) newErrors.fullName = 'Full name is required';
      if (!organization.trim()) newErrors.organization = 'Enterprise organization or network name is required';
      
      // Strict password criteria matching backend
      if (!password) {
        newErrors.password = 'Password is required';
      } else if (password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      } else if (!/[A-Z]/.test(password)) {
        newErrors.password = 'Password must contain at least one uppercase letter (A-Z)';
      } else if (!/[0-9]/.test(password)) {
        newErrors.password = 'Password must contain at least one digit (0-9)';
      }

      if (!pincode.trim() || !/^\d{6}$/.test(pincode.trim())) {
        newErrors.pincode = 'Enter a valid 6-digit Indian PIN code';
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
      role: selectedRole,
      storeName: storeName || `DarkStori - ${selectedCity} Pod 01`,
      pincode,
      sla: targetSla,
      fleet: fleetSize
    });
  };

  const handleLaunchPersona = async (persona) => {
    try {
      setGlobalRole(persona.role);
      await demoLogin({
        id: persona.id,
        role: persona.role,
        title: persona.title,
        city: selectedCity || persona.city
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
          <span>Back to DarkStori Overview</span>
        </Link>
        <div className="auth-brand-badge">
          <span className="brand-dot-pulse" />
          <span>DarkStori Autonomous Operating System</span>
        </div>
      </div>

      <div className="auth-main-card-container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="auth-glass-box"
          style={{ maxWidth: authMode === 'register' ? '680px' : '520px' }}
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
              Register New Hub
            </button>
            <button
              className={`auth-tab-btn ${authMode === 'demo' ? 'active' : ''}`}
              onClick={() => { setAuthMode('demo'); setErrors({}); }}
            >
              <Sparkles size={14} className="sparkle-gold" />
              <span>Instant Sandbox</span>
            </button>
          </div>

          {/* NEW USER ONBOARDING SUCCESS CONFIRMATION */}
          {onboardingSuccess && (
            <div className="p-6 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/40">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">DarkStori Pod Successfully Provisioned!</h2>
                <p className="text-sm text-white/70 max-w-md mx-auto mt-1.5">
                  Welcome <strong className="text-white">{onboardingSuccess.fullName}</strong>. Your micro-warehouse pod has been cryptographically registered on Neon PostgreSQL with your exact inputs.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-left max-w-md mx-auto space-y-2.5">
                <div className="flex justify-between items-center text-white/70">
                  <span>Registered Pod Name:</span>
                  <span className="text-amber-400 font-bold">{onboardingSuccess.storeName}</span>
                </div>
                <div className="flex justify-between items-center text-white/70">
                  <span>Metro & PIN Code:</span>
                  <span className="text-white font-bold">{onboardingSuccess.city} ({onboardingSuccess.pincode})</span>
                </div>
                <div className="flex justify-between items-center text-white/70">
                  <span>Target SLA & Swarm Fleet:</span>
                  <span className="text-emerald-400 font-bold">{onboardingSuccess.sla} SLA · {onboardingSuccess.fleet} Riders</span>
                </div>
                <div className="flex justify-between items-center text-white/70">
                  <span>Assigned Operational Lens:</span>
                  <span className="text-[#00F0FF] font-bold uppercase">{onboardingSuccess.role}</span>
                </div>
                <div className="flex justify-between items-center text-white/70">
                  <span>Organization:</span>
                  <span className="text-white/90">{onboardingSuccess.organization}</span>
                </div>
              </div>

              <button
                onClick={() => navigate(onboardingSuccess.targetRoute, { replace: true })}
                className="w-full max-w-md mx-auto py-3.5 rounded-xl bg-gradient-to-r from-[#FF9F1C] to-[#FFB703] text-black font-bold text-sm tracking-wide shadow-lg shadow-[#FF9F1C]/25 flex items-center justify-center gap-2 hover:brightness-110 transition-all cursor-pointer"
              >
                <span>Launch My DarkStori Pod</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* STANDARD SIGN IN / REGISTER FORM */}
          {!onboardingSuccess && authMode !== 'demo' && (
            <div className="auth-form-wrapper">
              <div className="auth-form-header">
                <h2>
                  {authMode === 'login' ? 'Sign In to DarkStori' : 'Provision Enterprise DarkStori Hub'}
                </h2>
                <p>
                  {authMode === 'login'
                    ? 'Enter your credentials to access your dark store operations shift.'
                    : 'Configure your company profile, focus metro, and initial dark store pod.'}
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
                    {/* SECTION 1: OPERATOR IDENTITY */}
                    <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400/90 font-bold mb-1">
                      1. Operator & Organization
                    </div>
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
                        <label>Company / Brand Name</label>
                        <div className="input-with-icon">
                          <Building2 size={16} className="field-icon" />
                          <input
                            type="text"
                            placeholder="e.g. Zepto Express Hubs"
                            value={organization}
                            onChange={(e) => setOrganization(e.target.value)}
                          />
                        </div>
                        {errors.organization && <span className="field-error">{errors.organization}</span>}
                      </div>
                    </div>

                    {/* SECTION 2: DARK STORE POD INPUTS */}
                    <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400/90 font-bold mt-3 mb-1">
                      2. Dark Store Pod Parameters
                    </div>
                    <div className="input-group-row">
                      <div className="input-wrap">
                        <label>Store Pod Name</label>
                        <div className="input-with-icon">
                          <Store size={16} className="field-icon" />
                          <input
                            type="text"
                            placeholder={`DarkStori - ${selectedCity} Pod 01`}
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="input-wrap">
                        <label>Focus Metro City</label>
                        <select
                          value={selectedCity}
                          onChange={(e) => handleCityChange(e.target.value)}
                          className="w-full bg-[#0a0f18] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
                        >
                          {METRO_CITIES.map(c => (
                            <option key={c.name} value={c.name}>{c.name} ({c.localities.split(',')[0]})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="input-group-row">
                      <div className="input-wrap">
                        <label>PIN Code</label>
                        <div className="input-with-icon">
                          <MapPin size={16} className="field-icon" />
                          <input
                            type="text"
                            placeholder="560038"
                            maxLength={6}
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value)}
                          />
                        </div>
                        {errors.pincode && <span className="field-error">{errors.pincode}</span>}
                      </div>

                      <div className="input-wrap">
                        <label>Target Delivery SLA</label>
                        <div className="input-with-icon">
                          <Clock size={16} className="field-icon" />
                          <select
                            value={targetSla}
                            onChange={(e) => setTargetSla(e.target.value)}
                            className="w-full bg-[#0a0f18] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
                          >
                            <option value="8m">8 Minutes (Hyper-Density)</option>
                            <option value="10m">10 Minutes (Standard Sub-10)</option>
                            <option value="12m">12 Minutes (Expanded Radial)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="input-group-row">
                      <div className="input-wrap">
                        <label>Active Rider Swarm Fleet</label>
                        <div className="input-with-icon">
                          <Bike size={16} className="field-icon" />
                          <select
                            value={fleetSize}
                            onChange={(e) => setFleetSize(e.target.value)}
                            className="w-full bg-[#0a0f18] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
                          >
                            <option value="8">8 EV Two-Wheelers</option>
                            <option value="12">12 EV Two-Wheelers (Recommended)</option>
                            <option value="18">18 EV Two-Wheelers (Peak Rush)</option>
                            <option value="24">24 EV Two-Wheelers (High Volume)</option>
                          </select>
                        </div>
                      </div>

                      <div className="input-wrap">
                        <label>Operational Lens</label>
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="w-full bg-[#0a0f18] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F59E0B]"
                        >
                          <option value="executive">Executive (Expansion, CapEx & ROI)</option>
                          <option value="store-gm">Store GM (Floor Throughput & Zero-Waste)</option>
                          <option value="fleet-commander">Fleet Commander (10-Min VRP SLA Radar)</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* SECTION 3: CREDENTIALS */}
                {authMode === 'register' && (
                  <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400/90 font-bold mt-3 mb-1">
                    3. Access Credentials
                  </div>
                )}

                <div className="input-wrap">
                  <label>Work Email</label>
                  <div className="input-with-icon">
                    <Mail size={16} className="field-icon" />
                    <input
                      type="email"
                      placeholder="operator@darkstori.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {errors.email && <span className="field-error">{errors.email}</span>}
                </div>

                <div className="input-wrap">
                  <label>Password</label>
                  <div className="input-with-icon">
                    <Lock size={16} className="field-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={authMode === 'register' ? 'Min 8 chars, 1 uppercase, 1 digit' : '••••••••••••'}
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
                  {authMode === 'register' && (
                    <span className="text-[10px] text-white/40 mt-1 block">
                      Requirement: At least 8 characters with 1 uppercase letter and 1 digit.
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={authMutation.isPending}
                  className="auth-submit-btn cursor-pointer mt-4"
                >
                  {authMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Provisioning on Neon PostgreSQL...
                    </span>
                  ) : (
                    <span>
                      {authMode === 'login' ? 'Sign In to DarkStori' : 'Initialize DarkStori Pod & Launch'}
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
                <h3 className="text-lg font-bold text-white tracking-tight">Instant Operational Fast-Pass</h3>
                <p className="text-xs text-white/60 mt-1">
                  Launch DarkStori immediately through pre-calibrated role personas with live on-ground telemetry.
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
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
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
                  className="text-xs text-white/50 hover:text-white underline transition-colors cursor-pointer"
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
