import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Reports from './pages/Reports';
import ScheduledFollowups from './pages/ScheduledFollowups';
import ActivePatients from './pages/ActivePatients';
import PatientModal from './components/PatientModal';
import VisitModal from './components/VisitModal';
import ConfirmationModal from './components/ConfirmationModal';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Theme State
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  
  // Auth State
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const cachedUser = localStorage.getItem('user');
    return cachedUser ? JSON.parse(cachedUser) : null;
  });

  // Navigation View State
  const [view, setView] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [refreshFlag, setRefreshFlag] = useState(0);

  // Global Alerts State
  const [alert, setAlert] = useState(null);

  // Modal Open/Close States
  const [patientModal, setPatientModal] = useState({ isOpen: false, data: null });
  const [visitModal, setVisitModal] = useState({ isOpen: false, patient: null });
  
  // Delete Dialog States
  const [deletePatientModal, setDeletePatientModal] = useState({ isOpen: false, patient: null });
  const [deleteVisitModal, setDeleteVisitModal] = useState({ isOpen: false, visit: null });

  // Sync Theme with DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle Token-Expiry on startup check
  useEffect(() => {
    if (token) {
      // Test authentication status
      apiFetch('/api/auth/me')
        .then(userData => {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        })
        .catch(() => {
          // Auto logout if session token is invalid
          handleLogout();
        });
    } else {
      setView('login');
    }
  }, [token]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 4500);
  };

  const handleLoginSuccess = (jwtToken, loggedUser) => {
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify(loggedUser));
    setToken(jwtToken);
    setUser(loggedUser);
    setView('dashboard');
    triggerAlert('success', `Welcome back, ${loggedUser.name}!`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setView('login');
    setSelectedPatientId(null);
  };

  // Centralized authenticated Fetch client
  const apiFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, { ...options, headers });
    
    if (res.status === 401 || res.status === 403) {
      handleLogout();
      throw new Error('Your session has expired. Please log in again.');
    }

    let data;
    try {
      data = await res.json();
    } catch (jsonErr) {
      const text = await res.clone().text();
      if (!res.ok) {
        throw new Error(text || 'Server request failed');
      }
      // If response was empty but OK, return empty object
      data = {};
    }

    if (!res.ok) {
      throw new Error(data?.error || 'Server request failed');
    }
    return data;
  };

  // Patient registration and profile modification handler
  const handlePatientSubmit = async (formData) => {
    try {
      const isEditing = !!patientModal.data;
      const url = isEditing ? `/api/patients/${patientModal.data.id}` : '/api/patients';
      const method = isEditing ? 'PUT' : 'POST';

      const savedPatient = await apiFetch(url, {
        method,
        body: JSON.stringify(formData)
      });

      setPatientModal({ isOpen: false, data: null });
      setRefreshFlag(prev => prev + 1);
      triggerAlert('success', `Patient profile ${isEditing ? 'updated' : 'registered'} successfully!`);
      
      if (!isEditing) {
        // Automatically open the details view for a newly registered patient
        setSelectedPatientId(savedPatient.id);
        setView('patient-detail');
      }
    } catch (err) {
      triggerAlert('danger', err.message);
    }
  };

  // Confirm soft delete of patient profile
  const handleConfirmDeletePatient = async () => {
    const { patient } = deletePatientModal;
    if (!patient) return;

    try {
      await apiFetch(`/api/patients/${patient.id}`, { method: 'DELETE' });
      setDeletePatientModal({ isOpen: false, patient: null });
      triggerAlert('success', `Patient "${patient.name}" has been soft-deleted.`);
      setView('patients');
      setRefreshFlag(prev => prev + 1);
    } catch (err) {
      triggerAlert('danger', err.message);
    }
  };

  // Visit session log submission
  const handleVisitSubmit = async (visitData) => {
    const { patient } = visitModal;
    if (!patient) return;

    try {
      await apiFetch(`/api/visits/patient/${patient.id}`, {
        method: 'POST',
        body: JSON.stringify(visitData)
      });

      setVisitModal({ isOpen: false, patient: null });
      setRefreshFlag(prev => prev + 1);
      triggerAlert('success', 'Treatment session visit logged successfully!');
      
      // Navigate to detail view
      setSelectedPatientId(patient.id);
      setView('patient-detail');
    } catch (err) {
      triggerAlert('danger', err.message);
    }
  };

  // Confirm soft delete of visit log
  const handleConfirmDeleteVisit = async () => {
    const { visit } = deleteVisitModal;
    if (!visit) return;

    try {
      await apiFetch(`/api/visits/${visit.id}`, { method: 'DELETE' });
      setDeleteVisitModal({ isOpen: false, visit: null });
      triggerAlert('success', 'Visit log record has been soft-deleted.');
      setRefreshFlag(prev => prev + 1);
    } catch (err) {
      triggerAlert('danger', err.message);
    }
  };

  // Route Views matching
  const renderActiveView = () => {
    switch (view) {
      case 'dashboard':
        return (
          <Dashboard 
            apiFetch={apiFetch} 
            setView={setView} 
            setSelectedPatientId={setSelectedPatientId}
            refreshFlag={refreshFlag}
            onOpenRegisterModal={() => setPatientModal({ isOpen: true, data: null })}
          />
        );
      case 'patients':
        return (
          <Patients 
            apiFetch={apiFetch} 
            setView={setView} 
            setSelectedPatientId={setSelectedPatientId}
            onOpenRegisterModal={() => setPatientModal({ isOpen: true, data: null })}
            onOpenEditModal={(p) => setPatientModal({ isOpen: true, data: p })}
            onOpenDeleteModal={(p) => setDeletePatientModal({ isOpen: true, patient: p })}
            refreshFlag={refreshFlag}
          />
        );
      case 'patient-detail':
        return (
          <PatientDetail 
            patientId={selectedPatientId}
            apiFetch={apiFetch} 
            setView={setView} 
            onOpenEditModal={(p) => setPatientModal({ isOpen: true, data: p })}
            onOpenLogVisitModal={(p) => setVisitModal({ isOpen: true, patient: p })}
            onOpenDeleteVisitModal={(v) => setDeleteVisitModal({ isOpen: true, visit: v })}
            refreshFlag={refreshFlag}
          />
        );
      case 'scheduled-followups':
        return (
          <ScheduledFollowups
            apiFetch={apiFetch}
            setView={setView}
            setSelectedPatientId={setSelectedPatientId}
            refreshFlag={refreshFlag}
          />
        );

      case 'active-patients':
        return (
          <ActivePatients
            apiFetch={apiFetch}
            setView={setView}
            setSelectedPatientId={setSelectedPatientId}
            refreshFlag={refreshFlag}
          />
        );
      case 'reports':
        return <Reports apiFetch={apiFetch} refreshFlag={refreshFlag} />;
      default:
        return <div>View not implemented.</div>;
    }
  };

  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <Sidebar 
        currentView={view} 
        setView={setView} 
        user={user} 
        onLogout={handleLogout}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Workspace content */}
      <main className="main-content">
        
        {/* Global Notification Banner */}
        {alert && (
          <div className={`alert-banner alert-banner-${alert.type}`}>
            <div className="alert-content-wrap">
              {alert.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{alert.message}</span>
            </div>
          </div>
        )}

        {/* Dynamic page router */}
        {renderActiveView()}
      </main>

      {/* Patient Intake / Update Dialog */}
      <PatientModal 
        isOpen={patientModal.isOpen}
        patient={patientModal.data}
        onClose={() => setPatientModal({ isOpen: false, data: null })}
        onSubmit={handlePatientSubmit}
      />

      {/* Visit treatment log Dialog */}
      <VisitModal 
        isOpen={visitModal.isOpen}
        lastVisit={visitModal.patient?.dashboard?.last_visit_date ? { services: [{ session_number: visitModal.patient.dashboard.total_visits, service_type: 'Manual Therapy' }] } : null}
        onClose={() => setVisitModal({ isOpen: false, patient: null })}
        onSubmit={handleVisitSubmit}
      />

      {/* Soft Delete Patient Dialog (Data Integrity) */}
      <ConfirmationModal 
        isOpen={deletePatientModal.isOpen}
        title="Confirm Delete Patient Profile"
        message={`Are you sure you want to delete patient "${deletePatientModal.patient?.name}"? This will soft-delete their profile and cascade soft-delete all associated visit histories.`}
        confirmText="Confirm Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDeletePatient}
        onCancel={() => setDeletePatientModal({ isOpen: false, patient: null })}
      />

      {/* Soft Delete Visit Log Dialog (Data Integrity) */}
      <ConfirmationModal 
        isOpen={deleteVisitModal.isOpen}
        title="Delete Treatment Session?"
        message={`This action will:
- Delete the selected treatment record.
- Update the patient's visit count.
- Update the last treatment session.
- Remove the next scheduled appointment (if it belongs to this visit).
- Refresh dashboard statistics and reports.
This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDeleteVisit}
        onCancel={() => setDeleteVisitModal({ isOpen: false, visit: null })}
      />

      <style>{`
        .alert-content-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
}
