import React, { useEffect, useState } from 'react';
import { Users, Calendar, AlertCircle, Plus, Search, ArrowRight, Phone, Clock } from 'lucide-react';

export default function Dashboard({ apiFetch, setView, setSelectedPatientId, refreshFlag, onOpenRegisterModal }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/reports/dashboard');
      setStats(data);
    } catch (err) {
      setError('Failed to load dashboard overview stats.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [refreshFlag]);

  const handlePatientClick = (patientId) => {
    setSelectedPatientId(patientId);
    setView('patient-detail');
  };

  // formatShortDate Helper
  const formatShortDate = (dateStr) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('T')[0].split(' ')[0].split('-');
    if (parts.length === 3) {
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${day} ${months[monthIndex]}`;
      }
    }
    return dateStr;
  };

  if (loading) {
    return <div className="dashboard-loading">Loading clinical data dashboard...</div>;
  }

  if (error) {
    return <div className="alert-banner alert-banner-danger">{error}</div>;
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header-section">
        <div>
          <h2>Clinic Overview</h2>
          <p className="text-muted">Delight Physiotherapy patient and visit operations</p>
        </div>
        <div className="quick-actions-bar">
          <button className="btn btn-primary" onClick={onOpenRegisterModal}>
            <Plus size={18} /> Register Patient
          </button>
          <button className="btn btn-secondary" onClick={() => setView('patients')}>
            <Search size={18} /> Patient Lookup
          </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="stats-grid">
        <div className="stats-card clickable-card" onClick={() => setView('active-patients')}>
          <div className="stats-card-icon prim-bg">
            <Users size={24} />
          </div>
          <div className="stats-card-info">
            <span className="stats-label">Active Patients</span>
            <span className="stats-value">{(stats?.active_patients_count ?? stats?.total_active_patients) || 0}</span>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-card-icon succ-bg">
            <Calendar size={24} />
          </div>
          <div className="stats-card-info">
            <span className="stats-label">Visits This Month</span>
            <span className="stats-value">{stats?.visits_this_month || 0}</span>
          </div>
        </div>

        <div className="stats-card alert-state-card clickable-card" onClick={() => setView('scheduled-followups')}>
          <div className="stats-card-icon warn-bg">
            <AlertCircle size={24} />
          </div>
          <div className="stats-card-info">
            <span className="stats-label">Scheduled Follow-ups</span>
            <span className="stats-value">{(stats?.scheduled_followups_count ?? stats?.followup_needed?.length) || 0}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-layout-main">
        {/* Follow-up Alerts Section */}
        <div className="card followup-card-container">
          <div className="card-header">
            <h3>Follow-up List (Inactive &gt;30 Days)</h3>
            <span className="badge badge-danger">
              {stats?.followup_needed?.length || 0} Flagged
            </span>
          </div>
          
          {stats?.followup_needed?.length === 0 ? (
            <div className="empty-state">
              <p className="text-muted">All ongoing patients are attending their appointments. No follow-up needed.</p>
            </div>
          ) : (
            <div className="table-container followup-table-container" style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Phone</th>
                    <th>Last Visit</th>
                    <th>Missed Appointment</th>
                    <th style={{ textAlign: 'right' }}>Days Overdue</th>
                    <th className="actions-header">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.followup_needed.map((patient) => (
                    <tr key={patient.id}>
                      <td>
                        <span 
                          className="patient-name-link"
                          onClick={() => handlePatientClick(patient.id)}
                          style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                        >
                          {patient.name}
                        </span>
                      </td>
                      <td className="font-mono">{patient.contact_number}</td>
                      <td>{formatShortDate(patient.last_visit_date)}</td>
                      <td>{formatShortDate(patient.missed_appointment_date)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="badge badge-danger">
                          {patient.days_since_missed}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handlePatientClick(patient.id)}
                        >
                          Open Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Operations Guide */}
        <div className="card info-actions-card">
          <h3>Quick Help Guide</h3>
          <p className="text-muted text-sm margin-bottom-md">How to use PhysioTrack during patient sessions:</p>
          
          <ul className="guide-list">
            <li>
              <div className="num">1</div>
              <div>
                <strong>Find or Register</strong>
                <p className="text-xs text-muted">Use top right 'Patient Lookup' to search by name or contact, or click 'Register Patient'.</p>
              </div>
            </li>
            <li>
              <div className="num">2</div>
              <div>
                <strong>Access Patient Dashboard</strong>
                <p className="text-xs text-muted">Click on a patient to view treatment logs, overall visit count, and scheduled follow-ups.</p>
              </div>
            </li>
            <li>
              <div className="num">3</div>
              <div>
                <strong>Record Visit in &lt;2 Mins</strong>
                <p className="text-xs text-muted">Click 'Record Visit' in the profile, enter complaints, select therapy type, and schedule next follow-up.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <style>{`
        .dashboard-page {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .dashboard-header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .quick-actions-bar {
          display: flex;
          gap: 0.75rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem;
        }

        .stats-card {
          background-color: var(--card-bg);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          box-shadow: var(--shadow-sm);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .clickable-card {
          cursor: pointer;
        }

        .clickable-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 32px rgba(0,0,0,0.08);
          border-color: rgba(0,0,0,0.08);
        }

        .stats-card-icon {
          width: 54px;
          height: 54px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .prim-bg { background-color: var(--primary); }
        .succ-bg { background-color: var(--success); }
        .warn-bg { background-color: var(--warning); }

        .alert-state-card {
          border-left: 4px solid var(--warning);
        }

        .stats-card-info {
          display: flex;
          flex-direction: column;
        }

        .stats-label {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .stats-value {
          font-size: 1.75rem;
          font-family: var(--font-title);
          font-weight: 700;
          line-height: 1.1;
        }

        .dashboard-layout-main {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }

        .followup-card-container {
          max-height: 500px;
          display: flex;
          flex-direction: column;
        }

        .followup-list {
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-right: 0.25rem;
        }

        .followup-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: var(--bg-color);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1rem;
          flex-wrap: wrap;
          gap: 0.75rem;
          transition: var(--transition);
        }

        .followup-item:hover {
          border-color: var(--danger);
          box-shadow: var(--shadow-sm);
        }

        .followup-item-left {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .followup-patient-name {
          font-weight: 600;
          color: var(--text-main);
          font-size: 1rem;
        }

        .followup-meta {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .meta-detail {
          font-size: 0.75rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .followup-item-right {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-left: auto;
        }

        .inactive-badge {
          background-color: var(--danger-light);
          color: var(--danger-text);
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .empty-state {
          padding: 3rem;
          text-align: center;
        }

        .guide-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-top: 1rem;
        }

        .guide-list li {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .guide-list .num {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: var(--primary-light);
          color: var(--primary-text);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
          flex-shrink: 0;
        }

        .margin-bottom-md {
          margin-bottom: 1rem;
        }

        .dashboard-loading {
          text-align: center;
          padding: 5rem;
          color: var(--text-muted);
          font-size: 1.1rem;
        }

        @media (max-width: 900px) {
          .dashboard-layout-main {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
