import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AmbientBackground from '../components/AmbientBackground';
import './Login.css';

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
      // Delay navigation briefly for the success checkmark animation
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

  // React Query Mutation
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
      // Shake animation trigger can be handled via local state
      setErrors({ submit: err.response?.data?.detail || 'Authentication failed. Please try again.' });
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

  return (
    <div className="login-page">
      <AmbientBackground />

      <div className="login-centered-container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`login-card ${errors.submit ? 'shake-card' : ''}`}
        >
          {/* Brand Wordmark & Tagline */}
          <div className="login-brand-header">
            <h1 className="brand-wordmark">
              Darkstori<span className="saffron-dot">.</span>
            </h1>
            <p className="brand-tagline">
              Quick-commerce intelligence for India's dark stores.
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
                <div className={`login-input-wrap ${errors.fullName ? 'field-error-border' : ''}`}>
                  <User size={18} className="login-icon-left" />
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors(prev => ({ ...prev, fullName: null }));
                    }}
                    disabled={mutation.isPending}
                  />
                </div>
                {errors.fullName && <span className="login-field-error-text">{errors.fullName}</span>}
              </div>
            )}

            <div className="login-field">
              <label className="login-label" htmlFor="email">Email</label>
              <div className={`login-input-wrap ${errors.email ? 'field-error-border' : ''}`}>
                <Mail size={18} className="login-icon-left" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: null, submit: null }));
                  }}
                  disabled={mutation.isPending}
                />
              </div>
              {errors.email && <span className="login-field-error-text">{errors.email}</span>}
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="password">Password</label>
              <div className={`login-input-wrap ${errors.password ? 'field-error-border' : ''}`}>
                <Lock size={18} className="login-icon-left" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors(prev => ({ ...prev, password: null, submit: null }));
                  }}
                  disabled={mutation.isPending}
                />
                <button
                  type="button"
                  className="login-pw-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className="login-field-error-text">{errors.password}</span>}
            </div>

            <div className="login-options-row">
              <label className="login-remember">
                <input type="checkbox" defaultChecked />
                <span>Remember me</span>
              </label>
              <a href="#forgot" className="forgot-password-link">Forgot password?</a>
            </div>

            <button
              type="submit"
              className="btn-primary login-submit-btn"
              disabled={mutation.isPending || successChecked}
            >
              {mutation.isPending ? (
                <Loader2 size={18} className="login-btn-spinner" />
              ) : successChecked ? (
                <span className="success-checkmark">✓ Verified</span>
              ) : isLogin ? (
                'Sign in'
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="login-card-footer">
            <span>{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
            <button onClick={toggleMode} className="login-switch-btn">
              {isLogin ? 'Create one' : 'Sign in'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
