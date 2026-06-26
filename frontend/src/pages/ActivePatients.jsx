import React, { useEffect, useState } from 'react';
import { Search, ArrowLeft, Eye, Calendar, Phone, Users } from 'lucide-react';

export default function ActivePatients({ apiFetch, setView, setSelectedPatientId, refreshFlag }) {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/reports/active-patients');
      setPatients(data);
    } catch (err) {
      setError('Failed to load active patients.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [refreshFlag]);

  const filteredPatients = patients.filter((patient) => {
    const normalized = (patient.name || '').toLowerCase();
    return normalized.includes(searchQuery.toLowerCase()) || (patient.contact_number || '').includes(searchQuery);
  });

  const handleViewProfile = (id) => {
    setSelectedPatientId(id);
    setView('patient-detail');
  };

  return (
    <div className="followup-list-page">
      <div className="page-header-container">
        <div>
          <h2>Active Patients</h2>
          <p className="text-muted">Patients with Treatment Status set to Ongoing.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setView('dashboard')}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      <div className="card search-filter-card">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-control search-input"
            placeholder="Search patient name or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="alert-banner alert-banner-danger">{error}</div>}

      {loading ? (
        <div className="table-loader">Loading active patients...</div>
      ) : filteredPatients.length === 0 ? (
        <div className="card empty-state-card">
          <Users size={42} className="empty-icon" />
          <h3>There are currently no active patients.</h3>
          <p className="text-muted">No patients are currently marked as Ongoing.</p>
        </div>
      ) : (
        <div className="table-container followup-table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Phone Number</th>
                <th>Last Visit Date</th>
                <th>Next Appointment Date</th>
                <th>Total Visits</th>
                <th>Current Treatment Plan</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <span className="link-text" onClick={() => handleViewProfile(patient.id)}>
                      {patient.name}
                    </span>
                  </td>
                  <td>{patient.age}</td>
                  <td>{patient.gender}</td>
                  <td>{patient.contact_number}</td>
                  <td>{patient.last_visit_date || '—'}</td>
                  <td>{patient.next_appointment_date || '—'}</td>
                  <td>{patient.total_visits}</td>
                  <td>{patient.current_treatment_plan || '—'}</td>
                  <td>
                    <span className="badge badge-primary">{patient.status}</span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleViewProfile(patient.id)}>
                      View Profile <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .followup-list-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .page-header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .followup-table-container {
          overflow-x: auto;
        }

        .link-text {
          color: var(--primary);
          cursor: pointer;
          font-weight: 600;
          transition: color 0.2s ease;
        }

        .link-text:hover {
          color: var(--primary-hover);
        }

        .empty-state-card {
          padding: 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: center;
        }

        .empty-icon {
          color: var(--warning);
        }
      `}</style>
    </div>
  );
}
