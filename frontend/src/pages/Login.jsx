import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Mail, Lock, Eye, EyeOff, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  // Handle message from OAuth popup
  useEffect(() => {
    const handleOAuthMessage = async (event) => {
      if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS') {
        const { email, name } = event.data;
        try {
          // Attempt registration with Google account details
          await register({ email, password: 'google_mock_password_123', full_name: name });
        } catch (err) {
          // If already registered, attempt login
          const errMsg = err.response?.data?.detail || err.message || '';
          if (err.response?.status === 400 || errMsg.toString().includes('registered')) {
            try {
              await login({ email, password: 'google_mock_password_123' });
            } catch (loginErr) {
              console.error("Google Auth fallback login failed:", loginErr);
            }
          } else {
            console.error("Google Auth registration failed:", err);
          }
        }
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [register, login, navigate, from]);

  const handleGoogleLogin = () => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      '',
      'GoogleSignIn',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=no`
    );
    
    if (!popup) {
      alert("Popup blocked! Please allow popups for Google Sign In.");
      return;
    }
    
    popup.document.write(`
      <html>
        <head>
          <title>Sign in with Google</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #0f172a;
              color: #e2e8f0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .card {
              border: 1px solid rgba(255,255,255,0.08);
              background: #1e293b;
              border-radius: 12px;
              padding: 40px;
              max-width: 400px;
              width: 100%;
              text-align: center;
              box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            }
            .logo {
              width: 75px;
              height: 24px;
              margin-bottom: 24px;
            }
            h1 {
              font-size: 22px;
              font-weight: 500;
              margin: 0 0 8px 0;
              color: #ffffff;
            }
            p {
              font-size: 14px;
              color: #94a3b8;
              margin: 0 0 32px 0;
            }
            .account-item {
              display: flex;
              align-items: center;
              padding: 12px 16px;
              border: 1px solid rgba(255,255,255,0.08);
              background: rgba(255,255,255,0.02);
              border-radius: 8px;
              cursor: pointer;
              transition: background-color 0.2s, border-color 0.2s;
              margin-bottom: 12px;
              text-align: left;
            }
            .account-item:hover {
              background-color: rgba(255,255,255,0.06);
              border-color: rgba(255,255,255,0.2);
            }
            .avatar {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 600;
              margin-right: 14px;
              font-size: 18px;
            }
            .details {
              display: flex;
              flex-direction: column;
            }
            .name {
              font-weight: 500;
              font-size: 14px;
              color: #ffffff;
            }
            .email {
              font-size: 12px;
              color: #94a3b8;
            }
            .loading {
              display: none;
              flex-direction: column;
              align-items: center;
              gap: 16px;
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 4px solid rgba(255,255,255,0.1);
              border-top: 4px solid #667eea;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="card" id="card">
            <svg class="logo" viewBox="0 0 74 24">
              <path d="M12.24 10.285V14.4h6.887c-.648 2.433-2.835 4.114-6.887 4.114-4.836 0-8.756-3.864-8.756-8.629 0-4.764 3.92-8.628 8.756-8.628 2.227 0 4.185.807 5.753 2.308l3.056-2.997C19.167 1.109 15.986 0 12.24 0 5.503 0 0 5.385 0 12.015 0 18.646 5.503 24 12.24 24c6.702 0 12.254-5.184 12.254-12.015 0-.82-.095-1.7-.268-2.315H12.24z" fill="#4285F4"/>
              <path d="M37.5 12.015c0 3.84-2.738 6.557-6.287 6.557-3.55 0-6.287-2.716-6.287-6.557 0-3.87 2.738-6.557 6.287-6.557 3.55 0 6.287 2.688 6.287 6.557zm-3.05 0c0-2.477-1.745-4.114-3.237-4.114-1.492 0-3.238 1.637-3.238 4.114 0 2.449 1.746 4.114 3.238 4.114 1.492 0 3.237-1.665 3.237-4.114z" fill="#EA4335"/>
              <path d="M51.5 12.015c0 3.84-2.738 6.557-6.287 6.557-3.55 0-6.287-2.716-6.287-6.557 0-3.87 2.738-6.557 6.287-6.557 3.55 0 6.287 2.688 6.287 6.557zm-3.05 0c0-2.477-1.745-4.114-3.237-4.114-1.492 0-3.238 1.637-3.238 4.114 0 2.449 1.746 4.114 3.238 4.114 1.492 0 3.237-1.665 3.237-4.114z" fill="#FBBC05"/>
              <path d="M64.75 6.015v11.13c0 4.576-2.712 6.45-5.912 6.45-3.064 0-4.897-2.036-5.597-3.725l2.67-1.1c.477 1.127 1.655 2.45 2.927 2.45 1.812 0 2.928-1.114 2.928-3.208V16.89h-.103c-.562.685-1.644 1.31-3.003 1.31-2.825 0-5.385-2.433-5.385-6.185 0-3.78 2.56-6.242 5.385-6.242 1.36 0 2.44.625 3.003 1.282h.103V6.015h3zm-2.81 5.987c0-2.422-1.627-4.086-3.11-4.086-1.513 0-2.927 1.664-2.927 4.086 0 2.394 1.414 4.086 2.927 4.086 1.483 0 3.11-1.692 3.11-4.086z" fill="#4285F4"/>
              <path d="M68 0h3v24h-3z" fill="#34A853"/>
            </svg>
            <h1>Choose an account</h1>
            <p>to continue to Darkstori</p>
            
            <div class="account-item" onclick="selectAccount('google.user@example.com', 'Google Partner')">
              <div class="avatar">GP</div>
              <div class="details">
                <span class="name">Google Partner</span>
                <span class="email">google.user@example.com</span>
              </div>
            </div>
            
            <div class="account-item" onclick="selectAccount('aditya.uniyal@example.com', 'Aditya Uniyal')">
              <div class="avatar">AU</div>
              <div class="details">
                <span class="name">Aditya Uniyal</span>
                <span class="email">aditya.uniyal@example.com</span>
              </div>
            </div>
          </div>

          <div class="loading" id="loading">
            <div class="spinner"></div>
            <span style="font-size: 14px; color: #94a3b8; margin-top: 10px;">Connecting to Darkstori...</span>
          </div>

          <script>
            function selectAccount(email, name) {
              document.getElementById('card').style.display = 'none';
              document.getElementById('loading').style.display = 'flex';
              
              setTimeout(() => {
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'GOOGLE_OAUTH_SUCCESS',
                    email: email,
                    name: name
                  }, '*');
                }
                window.close();
              }, 1200);
            }
          </script>
        </body>
      </html>
    `);
  };

  const validate = () => {
    const errs = {};
    if (!email) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email format';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'At least 6 characters';
    if (!isLogin && !fullName.trim()) errs.fullName = 'Name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const mutation = useMutation({
    mutationFn: () => isLogin
      ? login({ email, password })
      : register({ email, password, full_name: fullName }),
    onSuccess: () => navigate(from, { replace: true }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  };

  const toggleMode = () => {
    setIsLogin((v) => !v);
    setErrors({});
    mutation.reset();
  };

  return (
    <div className="login-page">
      <div className="login-brand">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="login-brand-content"
        >
          <Store size={48} className="login-brand-icon" />
          <h1 className="login-brand-title">Darkstori</h1>
          <p className="login-brand-tagline">Hyperlocal Intelligence Platform</p>
          <div className="login-brand-features">
            <div className="login-brand-feature">
              <div className="login-feature-dot" />
              <span>Real-time dark store analytics</span>
            </div>
            <div className="login-brand-feature">
              <div className="login-feature-dot" />
              <span>AI-powered demand forecasting</span>
            </div>
            <div className="login-brand-feature">
              <div className="login-feature-dot" />
              <span>5 focus Indian cities</span>
            </div>
            <div className="login-brand-feature">
              <div className="login-feature-dot" />
              <span>Competitive intelligence</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="login-form-wrap">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="login-form-container"
        >
          <div className="login-form-header">
            <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p>{isLogin ? 'Sign in to your account' : 'Register for a new account'}</p>
          </div>

          <AnimatePresence mode="wait">
            {mutation.isError && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="login-error-banner"
              >
                <AlertCircle size={16} />
                <span>{mutation.error?.response?.data?.detail || 'An error occurred. Please try again.'}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {!isLogin && (
              <div className="login-field">
                <label htmlFor="fullName">Full Name</label>
                <div className={`login-input-wrap ${errors.fullName ? 'has-error' : ''}`}>
                  <User size={18} className="login-input-icon" />
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                {errors.fullName && <span className="login-field-error">{errors.fullName}</span>}
              </div>
            )}

            <div className="login-field">
              <label htmlFor="email">Email Address</label>
              <div className={`login-input-wrap ${errors.email ? 'has-error' : ''}`}>
                <Mail size={18} className="login-input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="login-field-error">{errors.email}</span>}
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <div className={`login-input-wrap ${errors.password ? 'has-error' : ''}`}>
                <Lock size={18} className="login-input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
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
              {errors.password && <span className="login-field-error">{errors.password}</span>}
            </div>

            {isLogin && (
              <div className="login-options">
                <label className="login-remember">
                  <input type="checkbox" defaultChecked />
                  <span>Remember me</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 size={20} className="login-spinner" />
              ) : isLogin ? 'Sign In' : 'Create Account'}
            </button>

            <div className="login-divider">
              <span>or</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="login-google-btn"
            >
              <svg className="google-icon" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.89 3.02c.91-2.73 3.47-4.54 6.72-4.54z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.03 3.67-5.02 3.67-8.64z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.42c-.25-.76-.39-1.57-.39-2.42s.14-1.66.39-2.42L1.39 6.56C.5 8.35 0 10.12 0 12s.5 3.65 1.39 5.44l3.89-3.02z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.09 7.96-2.96l-3.76-2.91c-1.11.75-2.53 1.19-4.2 1.19-3.25 0-5.81-1.81-6.72-4.54l-3.89 3.02C3.37 20.33 7.35 23 12 23z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </form>

          <div className="login-toggle">
            <span>{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
            <button onClick={toggleMode} className="login-toggle-btn">
              {isLogin ? 'Register' : 'Sign In'}
            </button>
          </div>

          <div className="login-demo-notice">
            Demo mode — any email/password works for registration
          </div>
        </motion.div>
      </div>
    </div>
  );
}
