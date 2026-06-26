import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Eye, Edit2, Trash2, ShieldAlert } from 'lucide-react';

export default function Patients({ 
  apiFetch, 
  setView, 
  setSelectedPatientId, 
  onOpenRegisterModal,
  onOpenEditModal,
  onOpenDeleteModal,
  refreshFlag
}) {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPatients = async (query = '') => {
    try {
      setLoading(true);
      const data = await apiFetch(`/api/patients?q=${encodeURIComponent(query)}`);
      setPatients(data);
    } catch (err) {
      setError('Failed to fetch patient records.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients(searchQuery);
  }, [searchQuery, refreshFlag]);

  const handlePatientClick = (patientId) => {
    setSelectedPatientId(patientId);
    setView('patient-detail');
  };

  const sortedPatients = [...patients].sort((a, b) => {
    if (sortBy === 'newest') {
      const dateA = a.registration_date || a.created_at || '';
      const dateB = b.registration_date || b.created_at || '';
      return dateB.localeCompare(dateA);
    }
    if (sortBy === 'oldest') {
      const dateA = a.registration_date || a.created_at || '';
      const dateB = b.registration_date || b.created_at || '';
      return dateA.localeCompare(dateB);
    }
    // Alphabetical Name sorting
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="patients-database-page">
      <div className="page-header-container">
        <div>
          <h2>Patient Database</h2>
          <p className="text-muted">Register, search, and manage clinical patient files</p>
        </div>
        <button className="btn btn-primary" onClick={onOpenRegisterModal}>
          <UserPlus size={18} /> Register Patient
        </button>
      </div>

      <div className="search-filter-card card">
        <div className="filter-grid-wrapper">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              className="form-control search-input" 
              placeholder="Search patients by name or phone number..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="sort-dropdown-wrapper">
            <select
              className="form-control"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="name">Sort by: Name (A-Z)</option>
              <option value="newest">Sort by: Newest Registration</option>
              <option value="oldest">Sort by: Oldest Registration</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="alert-banner alert-banner-danger">{error}</div>}

      {loading && patients.length === 0 ? (
        <div className="table-loader">Retrieving clinical records...</div>
      ) : patients.length === 0 ? (
        <div className="card empty-records-state">
          <ShieldAlert size={48} className="empty-icon" />
          <h3>No Patient Records Found</h3>
          <p className="text-muted text-sm">
            {searchQuery 
              ? `No matches found for "${searchQuery}". Check spelling or try a different contact number.` 
              : "No patients registered yet. Click the 'Register Patient' button to add a new file."}
          </p>
        </div>
      ) : (
        <div className="patients-list-wrapper fade-in-anim">
          {/* Desktop Table View */}
          <div className="table-container desktop-only">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Age / Gender</th>
                  <th>Contact</th>
                  <th>Current Status</th>
                  <th>Address</th>
                  <th>Medical Summary</th>
                  <th className="actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedPatients.map(patient => (
                  <tr key={patient.id}>
                    <td>
                      <span 
                        className="patient-name-link"
                        onClick={() => handlePatientClick(patient.id)}
                      >
                        {patient.name}
                      </span>
                    </td>
                    <td>
                      <span className="info-cell">
                        {patient.age} yrs / {patient.gender}
                      </span>
                    </td>
                    <td>
                      <span className="info-cell font-mono">{patient.contact_number}</span>
                    </td>
                    <td>
                      {patient.status === 'Completed' ? (
                        <span className="badge badge-success">✅ Completed</span>
                      ) : patient.status === 'Ongoing' ? (
                        <span className="badge badge-primary">🟢 Ongoing</span>
                      ) : (
                        <span className="badge badge-warning">⏳ Not Started</span>
                      )}
                    </td>
                    <td>
                      <span className="info-cell address-cell" title={patient.address}>
                        {patient.address || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="info-cell history-cell" title={patient.medical_history}>
                        {patient.medical_history || '—'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <div className="actions-group">
                        <button 
                          className="btn-icon view" 
                          title="View Profile & Visit Log"
                          onClick={() => handlePatientClick(patient.id)}
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          className="btn-icon edit" 
                          title="Edit Patient Details"
                          onClick={() => onOpenEditModal(patient)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="btn-icon delete" 
                          title="Soft Delete Patient"
                          onClick={() => onOpenDeleteModal(patient)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="mobile-only patient-cards-list">
            {sortedPatients.map(patient => (
              <div key={patient.id} className="patient-mobile-card card">
                <div className="patient-card-row">
                  <span 
                    className="patient-card-name"
                    onClick={() => handlePatientClick(patient.id)}
                  >
                    {patient.name}
                  </span>
                  <span className="badge badge-primary">{patient.gender}, {patient.age} yrs</span>
                </div>
                
                <div className="patient-card-details">
                  <div className="detail-row">
                    <span className="label">Contact:</span>
                    <span className="value font-mono">{patient.contact_number}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Current Status:</span>
                    <span className="value">
                      {patient.status === 'Completed' ? (
                        <span className="badge badge-success">✅ Completed</span>
                      ) : patient.status === 'Ongoing' ? (
                        <span className="badge badge-primary">🟢 Ongoing</span>
                      ) : (
                        <span className="badge badge-warning">⏳ Not Started</span>
                      )}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Address:</span>
                    <span className="value">{patient.address || '—'}</span>
                  </div>
                  <div className="detail-row flex-column">
                    <span className="label">Medical History Summary:</span>
                    <p className="value medical-history-text">{patient.medical_history || '—'}</p>
                  </div>
                </div>

                <div className="patient-card-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => handlePatientClick(patient.id)}>
                    View Profile
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => onOpenEditModal(patient)}>
                    Edit Profile
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => onOpenDeleteModal(patient)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .patients-database-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .page-header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .search-filter-card {
          padding: 1rem !important;
        }

        .filter-grid-wrapper {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 600px) {
          .filter-grid-wrapper {
            grid-template-columns: 1fr;
          }
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          color: var(--text-muted);
        }

        .search-input {
          padding-left: 2.75rem !important;
        }

        .table-loader {
          text-align: center;
          padding: 4rem;
          color: var(--text-muted);
        }

        .empty-records-state {
          padding: 4rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .empty-icon {
          color: var(--text-muted);
        }

        .patient-name-link {
          font-weight: 600;
          color: var(--primary);
          cursor: pointer;
          transition: var(--transition);
        }
        .patient-name-link:hover {
          color: var(--primary-hover);
          text-decoration: underline;
        }

        .info-cell {
          font-size: 0.9rem;
          color: var(--text-main);
        }

        .font-mono {
          font-family: monospace;
          letter-spacing: 0.05em;
        }

        .address-cell, .history-cell {
          max-width: 180px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: inline-block;
        }

        .actions-header {
          text-align: right;
        }

        .actions-cell {
          text-align: right;
        }

        .actions-group {
          display: inline-flex;
          gap: 0.25rem;
        }

        .btn-icon.view:hover {
          color: var(--primary);
          background-color: var(--primary-light);
        }

        .btn-icon.edit:hover {
          color: var(--warning-text);
          background-color: var(--warning-light);
        }

        .btn-icon.delete:hover {
          color: var(--danger);
          background-color: var(--danger-light);
        }

        @media (max-width: 768px) {
          .address-cell, .history-cell {
            max-width: 100px;
          }
        }
      `}</style>
    </div>
  );
}
