import React, { useState } from 'react';
import { LogIn, Activity, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        const text = await response.clone().text();
        throw new Error(text || 'Login failed. Server returned an invalid response.');
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Login failed. Please check credentials.');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="full-screen">
      <div className="login-card fade-in-anim">
        <div className="login-header">
          <div className="login-logo">
            <Activity size={32} className="logo-pulse-icon" />
            <h2>PhysioTrack</h2>
          </div>
          <p className="login-subtitle">Delight Physiotherapy Clinic Management Portal</p>
        </div>

        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Username</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Enter your username" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group password-group">
            <label className="form-label">Password</label>
            <div className="password-input-container">
              <input 
                type={showPassword ? 'text' : 'password'} 
                className="form-control" 
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                required
              />
              <button 
                type="button" 
                className="btn-icon toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary login-submit-btn" disabled={loading}>
            {loading ? 'Authenticating...' : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <span className="confidential-badge">CONFIDENTIAL CLINICAL PLATFORM</span>
          <p className="text-muted text-xs">For Authorized Staff Only. Authorized access is logged.</p>
        </div>
      </div>

      <style>{`
        .login-card {
          width: 100%;
          max-width: 420px;
          background-color: var(--card-bg);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
          padding: 2.5rem 2rem;
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .login-header {
          text-align: center;
        }

        .login-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          color: var(--primary);
          margin-bottom: 0.5rem;
        }

        .logo-pulse-icon {
          animation: pulse 2s infinite;
        }

        .login-logo h2 {
          font-size: 1.85rem;
          font-weight: 800;
          margin-bottom: 0;
        }

        .login-subtitle {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background-color: var(--danger-light);
          color: var(--danger-text);
          border: 1px solid var(--danger);
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          animation: shake 0.4s ease-in-out;
        }

        .password-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .toggle-password-btn {
          position: absolute;
          right: 10px;
          color: var(--text-muted);
        }
        
        .toggle-password-btn:hover {
          color: var(--text-main);
          background: transparent;
        }

        .login-submit-btn {
          width: 100%;
          padding: 0.75rem !important;
          font-size: 1rem !important;
          margin-top: 0.5rem;
        }

        .login-footer {
          text-align: center;
          border-top: 1px solid var(--border-color);
          padding-top: 1rem;
          margin-top: 0.5rem;
        }

        .confidential-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          background-color: var(--warning-light);
          color: var(--warning-text);
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          margin-bottom: 0.5rem;
        }
      `}</style>
    </div>
  );
}
