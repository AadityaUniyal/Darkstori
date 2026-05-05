import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Store, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
  });
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: api.login,
    onSuccess: () => {
      navigate('/');
    },
    onError: (err) => {
      setError(err.response?.data?.detail || 'Login failed');
    },
  });

  const registerMutation = useMutation({
    mutationFn: api.register,
    onSuccess: () => {
      navigate('/');
    },
    onError: (err) => {
      setError(err.response?.data?.detail || 'Registration failed');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      loginMutation.mutate({
        email: formData.email,
        password: formData.password,
      });
    } else {
      registerMutation.mutate(formData);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left Side - Branding */}
        <div className="login-branding">
          <div className="branding-content">
            <div className="brand-logo">
              <Store size={48} />
            </div>
            <h1>Dark Store Intelligence</h1>
            <p>Enterprise-grade analytics for quick commerce market intelligence</p>
            
            <div className="features-list">
              <div className="feature-item">
                <div className="feature-icon">📊</div>
                <div>
                  <h3>Advanced Analytics</h3>
                  <p>Deep insights into market trends</p>
                </div>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon">🤖</div>
                <div>
                  <h3>AI-Powered Forecasting</h3>
                  <p>Predict demand with 85% accuracy</p>
                </div>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon">🗺️</div>
                <div>
                  <h3>Live Store Mapping</h3>
                  <p>4,400+ stores across India</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="login-form-container">
          <div className="form-wrapper">
            <div className="form-header">
              <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
              <p>
                {isLogin 
                  ? 'Sign in to access your dashboard' 
                  : 'Get started with Dark Store Intelligence'}
              </p>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="full_name">Full Name</label>
                  <div className="input-wrapper">
                    <User size={20} />
                    <input
                      type="text"
                      id="full_name"
                      name="full_name"
                      placeholder="John Doe"
                      value={formData.full_name}
                      onChange={handleChange}
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <Mail size={20} />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <Lock size={20} />
                  <input
                    type="password"
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {isLogin && (
                <div className="form-options">
                  <label className="checkbox-label">
                    <input type="checkbox" />
                    <span>Remember me</span>
                  </label>
                  <a href="#" className="forgot-link">Forgot password?</a>
                </div>
              )}

              <button 
                type="submit" 
                className="submit-btn"
                disabled={loginMutation.isLoading || registerMutation.isLoading}
              >
                {loginMutation.isLoading || registerMutation.isLoading ? (
                  'Please wait...'
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="form-footer">
              <p>
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
                {' '}
                <button 
                  className="toggle-btn"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>

            <div className="demo-notice">
              <p>🎯 <strong>Demo Mode:</strong> Use any email and password to explore</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
