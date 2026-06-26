import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save } from 'lucide-react';

export default function PatientModal({ isOpen, onClose, onSubmit, patient = null }) {
  const getTodayDateString = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset*60*1000));
    return localToday.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    name: '',
    registration_date: getTodayDateString(),
    age: '',
    gender: 'Male',
    contact_number: '',
    address: '',
    medical_history: ''
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (patient) {
      setFormData({
        name: patient.name || '',
        registration_date: (patient.registration_date || patient.created_at || '').split('T')[0].split(' ')[0] || getTodayDateString(),
        age: patient.age || '',
        gender: patient.gender || 'Male',
        contact_number: patient.contact_number || '',
        address: patient.address || '',
        medical_history: patient.medical_history || ''
      });
    } else {
      setFormData({
        name: '',
        registration_date: getTodayDateString(),
        age: '',
        gender: 'Male',
        contact_number: '',
        address: '',
        medical_history: ''
      });
    }
    setErrors({});
  }, [patient, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const tempErrors = {};
    if (!formData.name.trim()) tempErrors.name = 'Patient Name is required';
    if (!formData.registration_date) tempErrors.registration_date = 'Registration Date is required';
    if (!formData.age || Number(formData.age) <= 0) tempErrors.age = 'A valid positive age is required';
    if (!formData.contact_number.trim()) {
      tempErrors.contact_number = 'Contact number is required';
    } else if (!/^\+?[0-9\s-]{8,15}$/.test(formData.contact_number.trim())) {
      tempErrors.contact_number = 'Enter a valid contact number (8-15 digits)';
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title-text">
            {patient ? 'Edit Patient Profile' : 'Register New Patient'}
          </h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="patient-form">
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input 
                type="text" 
                name="name"
                className={`form-control ${errors.name ? 'input-error' : ''}`}
                placeholder="e.g. John Doe"
                value={formData.name}
                onChange={handleChange}
                autoFocus
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Registration Date *</label>
              <input 
                type="date" 
                name="registration_date"
                className={`form-control ${errors.registration_date ? 'input-error' : ''}`}
                value={formData.registration_date}
                onChange={handleChange}
              />
              {errors.registration_date && <span className="error-text">{errors.registration_date}</span>}
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Age *</label>
                <input 
                  type="number" 
                  name="age"
                  className={`form-control ${errors.age ? 'input-error' : ''}`}
                  placeholder="e.g. 34"
                  value={formData.age}
                  onChange={handleChange}
                  min="1"
                  max="125"
                />
                {errors.age && <span className="error-text">{errors.age}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Gender *</label>
                <select 
                  name="gender"
                  className="form-control"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contact Number *</label>
              <input 
                type="text" 
                name="contact_number"
                className={`form-control ${errors.contact_number ? 'input-error' : ''}`}
                placeholder="e.g. 9876543210"
                value={formData.contact_number}
                onChange={handleChange}
              />
              {errors.contact_number && <span className="error-text">{errors.contact_number}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Residential Address</label>
              <textarea 
                name="address"
                className="form-control"
                placeholder="Enter complete address..."
                rows="2"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Medical History Notes (Allergies, chronic conditions, etc.)</label>
              <textarea 
                name="medical_history"
                className="form-control"
                placeholder="e.g. Hypertension, previous ACL tear in left knee (2022)..."
                rows="3"
                value={formData.medical_history}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {patient ? <Save size={18} /> : <UserPlus size={18} />}
              {patient ? 'Save Changes' : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>
      
      <style>{`
        .modal-title-text {
          font-family: var(--font-title);
          font-size: 1.25rem;
          color: var(--text-main);
          font-weight: 600;
        }

        .patient-form {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .input-error {
          border-color: var(--danger) !important;
          box-shadow: 0 0 0 3px var(--danger-light) !important;
        }

        .error-text {
          color: var(--danger-text);
          font-size: 0.75rem;
          margin-top: 0.25rem;
          display: block;
        }
      `}</style>
    </div>
  );
}
