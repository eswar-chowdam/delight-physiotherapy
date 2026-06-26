import React from 'react';
import { LayoutDashboard, Users, BarChart3, LogOut, Sun, Moon, Activity } from 'lucide-react';

export default function Sidebar({ currentView, setView, user, onLogout, theme, toggleTheme }) {
  return (
    <aside className="sidebar-nav">
      <div className="sidebar-logo">
        <Activity size={24} className="logo-icon" />
        <span className="logo-text">PhysioTrack</span>
      </div>

      <div className="sidebar-user">
        <div className="avatar">
          {user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'PT'}
        </div>
        <div className="user-info">
          <span className="user-name">{user?.name || 'Physiotherapist'}</span>
          <span className="user-role">Staff</span>
        </div>
      </div>

      <nav className="nav-menu">
        <button 
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setView('dashboard')}
          title="Dashboard"
        >
          <LayoutDashboard size={20} />
          <span className="nav-text">Dashboard</span>
        </button>

        <button 
          className={`nav-item ${currentView === 'patients' || currentView === 'patient-detail' ? 'active' : ''}`}
          onClick={() => setView('patients')}
          title="Patients"
        >
          <Users size={20} />
          <span className="nav-text">Patients Database</span>
        </button>

        <button 
          className={`nav-item ${currentView === 'reports' ? 'active' : ''}`}
          onClick={() => setView('reports')}
          title="Reports & Analytics"
        >
          <BarChart3 size={20} />
          <span className="nav-text">Reports</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle Light/Dark Theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span className="footer-text">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        
        <button className="logout-btn" onClick={onLogout} title="Log Out">
          <LogOut size={18} />
          <span className="footer-text">Log Out</span>
        </button>
      </div>

      <style>{`
        .sidebar-nav {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: var(--sidebar-width);
          background-color: var(--sidebar-bg);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          padding: 1.5rem 1rem;
          z-index: 100;
          transition: var(--transition);
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2rem;
          color: var(--primary);
        }

        .logo-icon {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }

        .logo-text {
          font-family: var(--font-title);
          font-size: 1.35rem;
          font-weight: 700;
          letter-spacing: -0.025em;
          color: var(--text-main);
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background-color: var(--bg-color);
          border-radius: var(--radius-md);
          margin-bottom: 2rem;
          border: 1px solid var(--border-color);
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: var(--primary-light);
          color: var(--primary-text);
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          border: 2px solid var(--primary);
        }

        .user-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .user-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-role {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .nav-menu {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex-grow: 1;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          color: var(--text-muted);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: 500;
          text-align: left;
          transition: var(--transition);
        }

        .nav-item:hover {
          background-color: var(--bg-color);
          color: var(--text-main);
        }

        .nav-item.active {
          background-color: var(--primary-light);
          color: var(--primary-text);
          font-weight: 600;
        }

        .sidebar-footer {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          border-top: 1px solid var(--border-color);
          padding-top: 1rem;
        }

        .theme-toggle, .logout-btn {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          color: var(--text-muted);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: 500;
          text-align: left;
          transition: var(--transition);
          width: 100%;
        }

        .theme-toggle:hover, .logout-btn:hover {
          background-color: var(--bg-color);
          color: var(--text-main);
        }

        .logout-btn:hover {
          color: var(--danger);
          background-color: var(--danger-light);
        }

        /* Responsive Sidebar */
        @media (max-width: 1024px) {
          .sidebar-logo .logo-text,
          .user-info,
          .nav-text,
          .footer-text {
            display: none;
          }
          
          .sidebar-nav {
            align-items: center;
            padding: 1.5rem 0.5rem;
          }
          
          .sidebar-user {
            padding: 0.25rem;
            background: transparent;
            border: none;
          }
          
          .nav-item, .theme-toggle, .logout-btn {
            justify-content: center;
            padding: 0.75rem;
          }
        }

        @media (max-width: 768px) {
          .sidebar-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            top: auto;
            width: 100%;
            height: 60px;
            flex-direction: row;
            justify-content: space-around;
            padding: 0;
            border-right: none;
            border-top: 1px solid var(--border-color);
            background-color: var(--sidebar-bg);
            box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
          }
          
          .sidebar-logo, .sidebar-user {
            display: none;
          }
          
          .nav-menu {
            flex-direction: row;
            justify-content: space-around;
            width: 100%;
            gap: 0;
          }
          
          .nav-item {
            flex-grow: 1;
            justify-content: center;
            border-radius: 0;
            padding: 0.5rem;
          }
          
          .sidebar-footer {
            margin-top: 0;
            padding-top: 0;
            border-top: none;
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 0.25rem;
            padding-right: 0.5rem;
          }
          
          .theme-toggle, .logout-btn {
            padding: 0.5rem 0.75rem;
            width: auto;
            justify-content: center;
          }
        }
      `}</style>
    </aside>
  );
}
