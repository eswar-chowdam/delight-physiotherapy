import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Edit3, Plus, Calendar, Activity, 
  Trash2, Phone, MapPin, ClipboardList, Info,
  AlertTriangle, Clock, RefreshCcw, Search
} from 'lucide-react';

export default function PatientDetail({ 
  patientId, 
  apiFetch, 
  setView, 
  onOpenEditModal, 
  onOpenLogVisitModal,
  onOpenDeleteVisitModal,
  refreshFlag
}) {
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // formatDate Helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('T')[0].split(' ')[0].split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${day} ${months[monthIndex]} ${year}`;
      }
    }
    return dateStr;
  };

  const loadPatientData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch Patient + Stats
      const patientData = await apiFetch(`/api/patients/${patientId}`);
      setPatient(patientData);
    } catch (err) {
      setError('Failed to load patient records and treatment history.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadPatientData();
    }
  }, [patientId, refreshFlag]);

  // Debounce the search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Load visits based on debounced search query
  useEffect(() => {
    const loadFilteredVisits = async () => {
      try {
        const visitData = await apiFetch(`/api/visits?patient_id=${patientId}&q=${encodeURIComponent(debouncedQuery)}`);
        setVisits(visitData);
      } catch (err) {
        console.error('Failed to load visit history:', err);
      }
    };

    if (patientId) {
      loadFilteredVisits();
    }
  }, [debouncedQuery, patientId, refreshFlag]);

  // Compute 30-day missed appointment follow-up status
  const getMissedFollowupStatus = () => {
    if (!patient || !patient.dashboard) return null;
    const { next_appointment, current_treatment_status } = patient.dashboard;
    if (current_treatment_status !== 'Ongoing' || !next_appointment) return null;
    
    // Check if there is any visit on or after next_appointment date
    const attended = visits.some(v => v.visit_date >= next_appointment);
    if (attended) return null;
    
    const apptDate = new Date(next_appointment);
    const today = new Date();
    const daysSinceMissed = Math.floor((today.setHours(0,0,0,0) - apptDate.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
    
    return {
      isInactive: daysSinceMissed > 30,
      days: daysSinceMissed,
      appointmentDate: next_appointment
    };
  };

  const status = getMissedFollowupStatus();

  if (loading) {
    return <div className="detail-loading">Loading medical record charts...</div>;
  }

  if (error || !patient) {
    return (
      <div className="error-screen">
        <div className="alert-banner alert-banner-danger">{error || 'Patient profile not found.'}</div>
        <button className="btn btn-secondary" onClick={() => setView('patients')}>
          <ArrowLeft size={16} /> Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="patient-detail-page">
      {/* Top Navigation & Quick Actions */}
      <div className="detail-nav-actions">
        <button className="btn btn-secondary" onClick={() => setView('patients')}>
          <ArrowLeft size={16} /> Back to Directory
        </button>
        <div className="detail-header-actions">
          <button className="btn btn-secondary" onClick={() => onOpenEditModal(patient)}>
            <Edit3 size={16} /> Edit Profile
          </button>
          <button className="btn btn-primary" onClick={() => onOpenLogVisitModal(patient)}>
            <Plus size={16} /> Record Session Visit
          </button>
        </div>
      </div>

      {/* 30 Days Inactivity Alert */}
      {status?.isInactive && (
        <div className="alert-banner alert-banner-warning followup-alert-banner fade-in-anim">
          <AlertTriangle size={20} />
          <div>
            <strong>Follow-up Required:</strong> Patient missed their scheduled appointment on <strong>{formatDate(status.appointmentDate)}</strong> (overdue by <strong>{status.days} days</strong>).
          </div>
        </div>
      )}

      {/* Quick Summary Card */}
      <div className="card quick-summary-card">
        <div className="summary-field">
          <span className="summary-label">Registered On</span>
          <span className="summary-value">{formatDate(patient.registration_date)}</span>
        </div>
        <div className="summary-field">
          <span className="summary-label">Last Visit</span>
          <span className="summary-value">{formatDate(patient.dashboard?.last_visit_date)}</span>
        </div>
        <div className="summary-field">
          <span className="summary-label">Next Appointment</span>
          <span className="summary-value">{formatDate(patient.dashboard?.next_appointment)}</span>
        </div>
        <div className="summary-field">
          <span className="summary-label">Current Status</span>
          <span className="summary-value">
            {patient.dashboard?.current_treatment_status === 'Completed' 
              ? '✅ Completed' 
              : patient.dashboard?.current_treatment_status === 'Not Started'
                ? '⏳ Not Started'
                : '🟢 Ongoing'}
          </span>
        </div>
      </div>

      {/* Main Grid: Info card & Dashboard stats */}
      <div className="patient-detail-grid">
        
        {/* Profile Card */}
        <div className="card profile-info-card">
          <div className="profile-card-header">
            <div className="profile-avatar">
              {patient.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
            </div>
            <div>
              <h3>{patient.name}</h3>
              <span className="badge badge-primary">{patient.gender}, {patient.age} yrs</span>
            </div>
          </div>
          
          <div className="profile-details-list">
            <div className="profile-detail-item">
              <Phone size={16} className="item-icon" />
              <div>
                <span className="item-label">Contact Number</span>
                <span className="item-val font-mono">{patient.contact_number}</span>
              </div>
            </div>

            <div className="profile-detail-item">
              <MapPin size={16} className="item-icon" />
              <div>
                <span className="item-label">Address</span>
                <span className="item-val">{patient.address || 'Not specified'}</span>
              </div>
            </div>

            <div className="profile-detail-item alignment-start">
              <ClipboardList size={16} className="item-icon margin-top-xs" />
              <div>
                <span className="item-label">Initial Medical History Notes</span>
                <p className="item-val medical-notes-block">
                  {patient.medical_history || 'No medical history noted during intake.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="patient-dashboard-grid">
          <div className="card stat-tile">
            <span className="tile-label">Total Visits</span>
            <span className="tile-value">{patient.dashboard?.total_visits || 0}</span>
          </div>

          <div className="card stat-tile">
            <span className="tile-label">Last Treatment Session</span>
            <span className="tile-value text-md-tile">
              {patient.dashboard?.last_visit_date 
                ? formatDate(patient.dashboard.last_visit_date) 
                : '—'}
            </span>
          </div>


          <div className="card stat-tile">
            <span className="tile-label">Current Treatment Status</span>
            <span className={`tile-value text-md-tile ${
              patient.dashboard?.current_treatment_status === 'Completed' 
                ? 'text-success' 
                : patient.dashboard?.current_treatment_status === 'Not Started'
                  ? 'text-warning'
                  : 'text-primary'
            }`}>
              {patient.dashboard?.current_treatment_status === 'Completed' 
                ? '✅ Completed' 
                : patient.dashboard?.current_treatment_status === 'Not Started'
                  ? '⏳ Not Started'
                  : '🟢 Ongoing'}
            </span>
          </div>

          <div className="card stat-tile">
            <span className="tile-label">Next Scheduled Session</span>
            <span className="tile-value text-md-tile text-primary">
              {patient.dashboard?.next_appointment 
                ? formatDate(patient.dashboard.next_appointment) 
                : 'None Scheduled'}
            </span>
            {patient.dashboard?.next_appointment_notes && (
              <span className="tile-subtext" title={patient.dashboard.next_appointment_notes}>
                Note: {patient.dashboard.next_appointment_notes}
              </span>
            )}
            {patient.dashboard?.next_appointment_days_remaining !== null && (
              <span className="tile-subtext">
                {patient.dashboard.next_appointment_days_remaining} day(s) remaining
              </span>
            )}
          </div>

          <div className="card stat-tile col-span-full">
            <span className="tile-label">Active Treatment Plan Summary</span>
            <p className="tile-para">
              {patient.dashboard?.current_treatment_plan || 'No treatments recorded.'}
            </p>
          </div>
        </div>
      </div>

      {/* Visit Logs Timeline */}
      <div className="visit-history-section">
        <h3>Treatment Visit History</h3>
        
        <div className="card search-filter-card" style={{ marginBottom: '1.25rem', padding: '0.75rem' }}>
          <div className="search-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search className="search-icon" size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-control search-input" 
              placeholder="Search by patient, date, treatment, complaint, or target area..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>
        </div>
        
        {visits.length === 0 ? (
          searchQuery ? (
            <div className="card empty-visits-card">
              <Info size={36} />
              <p>No visit records found.</p>
            </div>
          ) : (
            <div className="card empty-visits-card">
              <Info size={36} />
              <p>No treatment sessions have been recorded yet.</p>
              <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>Click "Record Session Visit" to begin treatment.</p>
              <button className="btn btn-primary btn-sm" onClick={() => onOpenLogVisitModal(patient)}>
                <Plus size={16} /> Record Session Visit
              </button>
            </div>
          )
        ) : (
          <div className="timeline">
            {visits.map((visit) => (
              <div key={visit.id} className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  
                  <div className="timeline-header">
                    <div className="visit-date-duration">
                      <span className="visit-date">
                        <Calendar size={14} /> {visit.visit_date}
                      </span>
                      <span className="visit-duration">
                        <Clock size={14} /> {visit.duration_minutes} mins
                      </span>
                    </div>
                    
                    <button 
                      className="btn-icon delete-visit-btn" 
                      title="Soft Delete Visit Log"
                      onClick={() => onOpenDeleteVisitModal(visit)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="visit-diagnostics">
                    <div className="diagnostic-block">
                      <strong className="block-label">Complaint / Reason:</strong>
                      <p className="block-text">{visit.complaint}</p>
                    </div>

                    <div className="diagnostic-block">
                      <strong className="block-label">Treatment Given:</strong>
                      <p className="block-text">{visit.treatment_given}</p>
                    </div>
                  </div>

                  {/* Modalities details */}
                  {visit.services && visit.services.length > 0 && (
                    <div className="visit-modalities">
                      <span className="modalities-section-title">Therapeutic Modalities Logged:</span>
                      <div className="modalities-list">
                        {visit.services.map((svc) => (
                          <div key={svc.id} className="modality-badge-item">
                            <div className="modality-badge-header">
                              <span className="modality-type">{svc.service_type}</span>
                              <span className="modality-session">Session #{svc.session_number}</span>
                            </div>
                            <div className="modality-body-part">Target: {svc.body_part}</div>
                            {svc.progress_notes && (
                              <div className="modality-progress">
                                <strong>Notes:</strong> {svc.progress_notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* General observations notes */}
                  {visit.notes && (
                    <div className="visit-general-notes">
                      <strong>Therapist Observations:</strong>
                      <p className="observations-text">{visit.notes}</p>
                    </div>
                  )}

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .patient-detail-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .quick-summary-card {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1.5rem;
          padding: 1.25rem !important;
          background-color: var(--primary-light) !important;
          border: 1px solid var(--primary) !important;
        }

        .summary-field {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .summary-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .summary-value {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .detail-nav-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .detail-header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .followup-alert-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .patient-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 1.5rem;
        }

        .profile-info-card {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .profile-card-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .profile-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background-color: var(--primary-light);
          color: var(--primary-text);
          font-weight: 700;
          font-size: 1.35rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid var(--primary);
        }

        .profile-details-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .profile-detail-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .overdue-status-tile {
          border-left: 4px solid var(--danger);
          background-color: rgba(255, 77, 79, 0.06);
        }

        .text-danger {
          color: var(--danger);
        }

        .alignment-start {
          align-items: flex-start !important;
        }

        .margin-top-xs {
          margin-top: 0.2rem;
        }

        .item-icon {
          color: var(--primary);
          flex-shrink: 0;
        }

        .item-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .item-val {
          font-size: 0.925rem;
          color: var(--text-main);
          font-weight: 550;
        }

        .medical-notes-block {
          white-space: pre-wrap;
          font-weight: 400;
          font-size: 0.875rem;
          background-color: var(--bg-color);
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          line-height: 1.4;
          margin-top: 0.25rem;
        }

        /* Dashboard grid */
        .patient-dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 1rem;
        }

        .stat-tile {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1.25rem !important;
        }

        .tile-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .tile-value {
          font-family: var(--font-title);
          font-size: 2rem;
          font-weight: 700;
          line-height: 1.2;
          margin-top: 0.25rem;
        }

        .text-md-tile {
          font-size: 1.25rem !important;
          font-weight: 600;
          word-break: break-all;
        }

        .tile-subtext {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .col-span-full {
          grid-column: 1 / -1;
        }

        .tile-para {
          font-size: 0.9rem;
          line-height: 1.4;
          color: var(--text-main);
          margin-top: 0.5rem;
        }

        /* Timeline styles */
        .visit-history-section {
          margin-top: 1.5rem;
        }

        .visit-history-section h3 {
          margin-bottom: 1rem;
        }

        .empty-visits-card {
          padding: 3rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: var(--text-muted);
        }

        .visit-date-duration {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .visit-date {
          font-weight: 600;
          color: var(--primary);
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.95rem;
        }

        .visit-duration {
          background-color: var(--bg-color);
          color: var(--text-muted);
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .delete-visit-btn {
          color: var(--text-muted) !important;
        }
        .delete-visit-btn:hover {
          color: var(--danger) !important;
          background-color: var(--danger-light) !important;
        }

        .visit-diagnostics {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-top: 0.75rem;
          background-color: var(--bg-color);
          padding: 0.85rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }

        .diagnostic-block {
          display: flex;
          flex-direction: column;
        }

        .block-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .block-text {
          font-size: 0.9rem;
          color: var(--text-main);
          margin-top: 0.15rem;
          line-height: 1.35;
        }

        .visit-modalities {
          margin-top: 1rem;
        }

        .modalities-section-title {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
          text-transform: uppercase;
        }

        .modalities-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.75rem;
        }

        .modality-badge-item {
          border: 1px solid var(--border-color);
          background-color: var(--bg-color);
          border-radius: var(--radius-sm);
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .modality-badge-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modality-type {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--primary);
        }

        .modality-session {
          font-size: 0.7rem;
          font-weight: 600;
          background-color: var(--primary-light);
          color: var(--primary-text);
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
        }

        .modality-body-part {
          font-size: 0.8rem;
          color: var(--text-main);
          font-weight: 500;
        }

        .modality-progress {
          font-size: 0.75rem;
          color: var(--text-muted);
          border-top: 1px dashed var(--border-color);
          padding-top: 0.25rem;
          margin-top: 0.25rem;
        }

        .visit-general-notes {
          margin-top: 1rem;
          padding-top: 0.75rem;
          border-top: 1px dashed var(--border-color);
          font-size: 0.85rem;
        }

        .observations-text {
          color: var(--text-main);
          margin-top: 0.15rem;
        }

        .detail-loading {
          text-align: center;
          padding: 5rem;
          color: var(--text-muted);
        }

        .error-screen {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
          padding: 2rem 0;
        }

        @media (max-width: 900px) {
          .patient-detail-grid {
            grid-template-columns: 1fr;
          }
          
          .visit-diagnostics {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
