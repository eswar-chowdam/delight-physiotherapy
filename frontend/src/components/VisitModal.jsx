import React, { useState, useEffect } from 'react';
import { X, Calendar, Clipboard, Plus, Trash } from 'lucide-react';

const SERVICE_TYPES = [
  'Manual Therapy',
  'Electrotherapy',
  'Exercise Therapy',
  'Kinesiology Taping',
  'Dry Needling',
  'Ultrasound Therapy',
  'Heat/Cold Therapy',
  'Others'
];

export default function VisitModal({ isOpen, onClose, onSubmit, lastVisit = null }) {
  const getTodayDateString = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset*60*1000));
    return localToday.toISOString().split('T')[0];
  };

  const [visitDate, setVisitDate] = useState(getTodayDateString());
  const [complaint, setComplaint] = useState('');
  const [treatmentGiven, setTreatmentGiven] = useState('');
  const [treatmentStatus, setTreatmentStatus] = useState('Ongoing');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [notes, setNotes] = useState('');
  
  // Single service item state (for simplicity, they can add multiple, but default to 1 service item)
  const [services, setServices] = useState([
    {
      service_type: 'Manual Therapy',
      body_part: '',
      session_number: 1,
      progress_notes: 'Improving'
    }
  ]);

  // Next appointment (optional)
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextAptDate, setNextAptDate] = useState('');
  const [nextAptNotes, setNextAptNotes] = useState('');

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setVisitDate(getTodayDateString());
      setComplaint('');
      setTreatmentGiven('');
      setTreatmentStatus(lastVisit?.treatment_status || 'Ongoing');
      setDurationMinutes(45);
      setNotes('');
      setScheduleNext(false);
      setNextAptDate('');
      setNextAptNotes('');
      setErrors({});

      // Infer session number from last visit if exists
      let nextSessionNo = 1;
      let lastSvcType = 'Manual Therapy';
      let lastBodyPart = '';

      if (lastVisit && lastVisit.services && lastVisit.services.length > 0) {
        const primarySvc = lastVisit.services[0];
        nextSessionNo = Number(primarySvc.session_number) + 1;
        lastSvcType = primarySvc.service_type || 'Manual Therapy';
        lastBodyPart = primarySvc.body_part || '';
      }

      setServices([
        {
          service_type: lastSvcType,
          body_part: lastBodyPart,
          session_number: nextSessionNo,
          progress_notes: 'Patient improving'
        }
      ]);
    }
  }, [isOpen, lastVisit]);

  if (!isOpen) return null;

  const handleAddService = () => {
    const lastSession = services.length > 0 ? services[services.length - 1].session_number : 0;
    setServices(prev => [
      ...prev,
      {
        service_type: 'Manual Therapy',
        body_part: '',
        session_number: Number(lastSession) + 1,
        progress_notes: 'Patient improving'
      }
    ]);
  };

  const handleRemoveService = (index) => {
    if (services.length === 1) return; // Must have at least 1 service
    setServices(prev => prev.filter((_, i) => i !== index));
  };

  const handleServiceChange = (index, field, value) => {
    setServices(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const validate = () => {
    const tempErrors = {};
    if (!visitDate) tempErrors.visitDate = 'Visit date is required';
    if (!complaint.trim()) tempErrors.complaint = 'Reason/Complaint is required';
    if (!treatmentGiven.trim()) tempErrors.treatmentGiven = 'Treatment detail is required';
    if (!treatmentStatus.trim()) tempErrors.treatmentStatus = 'Treatment status is required';
    if (!durationMinutes || durationMinutes <= 0) tempErrors.durationMinutes = 'Valid duration is required';
    
    // Validate service fields
    services.forEach((s, idx) => {
      if (!s.body_part.trim()) {
        tempErrors[`service_body_${idx}`] = 'Body part is required';
      }
    });

    if (scheduleNext && !nextAptDate) {
      tempErrors.nextAptDate = 'Appointment date is required if scheduled';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      visit_date: visitDate,
      complaint,
      treatment_given: treatmentGiven,
      treatment_status: treatmentStatus,
      duration_minutes: Number(durationMinutes),
      notes,
      services,
      next_appointment: scheduleNext ? {
        appointment_date: nextAptDate,
        notes: nextAptNotes
      } : null
    };

    onSubmit(payload);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container visit-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title-text">Record Patient Visit & Treatment</h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="visit-form">
          <div className="modal-body">
            
            {/* Visit Details */}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Visit Date *</label>
                <input 
                  type="date" 
                  className={`form-control ${errors.visitDate ? 'input-error' : ''}`}
                  value={visitDate}
                  onChange={e => {
                    setVisitDate(e.target.value);
                    if (errors.visitDate) setErrors(prev => ({ ...prev, visitDate: '' }));
                  }}
                />
                {errors.visitDate && <span className="error-text">{errors.visitDate}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Session Duration (minutes) *</label>
                <div className="duration-input-wrapper">
                  <input 
                    type="number" 
                    className={`form-control ${errors.durationMinutes ? 'input-error' : ''}`}
                    value={durationMinutes}
                    onChange={e => {
                      setDurationMinutes(e.target.value);
                      if (errors.durationMinutes) setErrors(prev => ({ ...prev, durationMinutes: '' }));
                    }}
                    min="5"
                    max="180"
                  />
                  <div className="duration-quick-presets">
                    <button type="button" className="btn btn-secondary btn-sm-preset" onClick={() => setDurationMinutes(30)}>30m</button>
                    <button type="button" className="btn btn-secondary btn-sm-preset" onClick={() => setDurationMinutes(45)}>45m</button>
                    <button type="button" className="btn btn-secondary btn-sm-preset" onClick={() => setDurationMinutes(60)}>60m</button>
                  </div>
                </div>
                {errors.durationMinutes && <span className="error-text">{errors.durationMinutes}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Complaint / Reason for Visit *</label>
              <input 
                type="text" 
                className={`form-control ${errors.complaint ? 'input-error' : ''}`}
                placeholder="e.g. Acute lower back pain radiating down left thigh"
                value={complaint}
                onChange={e => {
                  setComplaint(e.target.value);
                  if (errors.complaint) setErrors(prev => ({ ...prev, complaint: '' }));
                }}
              />
              {errors.complaint && <span className="error-text">{errors.complaint}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Treatment Given *</label>
              <textarea 
                className={`form-control ${errors.treatmentGiven ? 'input-error' : ''}`}
                placeholder="e.g. Spine mobilization, lumbar traction, myofascial release, dry needling on piriformis"
                rows="2"
                value={treatmentGiven}
                onChange={e => {
                  setTreatmentGiven(e.target.value);
                  if (errors.treatmentGiven) setErrors(prev => ({ ...prev, treatmentGiven: '' }));
                }}
              />
              {errors.treatmentGiven && <span className="error-text">{errors.treatmentGiven}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Treatment Status *</label>
              <select
                className={`form-control ${errors.treatmentStatus ? 'input-error' : ''}`}
                value={treatmentStatus}
                onChange={e => {
                  setTreatmentStatus(e.target.value);
                  if (errors.treatmentStatus) setErrors(prev => ({ ...prev, treatmentStatus: '' }));
                }}
              >
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
              </select>
              {errors.treatmentStatus && <span className="error-text">{errors.treatmentStatus}</span>}
            </div>

            {/* Service Logs section */}
            <div className="services-section">
              <div className="services-section-header">
                <h4>Services & Modalities</h4>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddService}>
                  <Plus size={14} /> Add Modality
                </button>
              </div>
              
              {services.map((svc, idx) => (
                <div key={idx} className="service-row-container">
                  <div className="service-row-header">
                    <span className="service-index-label">Modality #{idx+1}</span>
                    {services.length > 1 && (
                      <button type="button" className="btn-icon delete-row-btn" onClick={() => handleRemoveService(idx)}>
                        <Trash size={14} />
                      </button>
                    )}
                  </div>

                  <div className="form-grid service-fields-grid">
                    <div className="form-group">
                      <label className="form-label text-xs">Service Type</label>
                      <select
                        className="form-control text-sm"
                        value={svc.service_type}
                        onChange={e => handleServiceChange(idx, 'service_type', e.target.value)}
                      >
                        {SERVICE_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label text-xs">Body Part Treated *</label>
                      <input
                        type="text"
                        placeholder="e.g. Lumbar spine, Left knee"
                        className={`form-control text-sm ${errors[`service_body_${idx}`] ? 'input-error' : ''}`}
                        value={svc.body_part}
                        onChange={e => {
                          handleServiceChange(idx, 'body_part', e.target.value);
                          if (errors[`service_body_${idx}`]) {
                            setErrors(prev => ({ ...prev, [`service_body_${idx}`]: '' }));
                          }
                        }}
                      />
                      {errors[`service_body_${idx}`] && <span className="error-text">{errors[`service_body_${idx}`]}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label text-xs">Session Number</label>
                      <input
                        type="number"
                        className="form-control text-sm"
                        value={svc.session_number}
                        onChange={e => handleServiceChange(idx, 'session_number', Number(e.target.value))}
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="form-group margin-top-sm">
                    <label className="form-label text-xs">Progress Notes & Response</label>
                    <input
                      type="text"
                      placeholder="e.g. Improving, pain level went from 7/10 to 4/10 post treatment"
                      className="form-control text-sm"
                      value={svc.progress_notes}
                      onChange={e => handleServiceChange(idx, 'progress_notes', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* General Notes */}
            <div className="form-group">
              <label className="form-label">General Therapist Notes</label>
              <textarea 
                className="form-control"
                placeholder="Additional observations, home exercise instruction compliance, etc."
                rows="2"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {/* Next Appointment Scheduling */}
            <div className="appointment-toggle-wrapper">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={scheduleNext} 
                  onChange={e => setScheduleNext(e.target.checked)} 
                />
                Schedule Follow-up Appointment?
              </label>
            </div>

            {scheduleNext && (
              <div className="form-grid appointment-fields fade-in-anim">
                <div className="form-group">
                  <label className="form-label">Next Visit Date *</label>
                  <input 
                    type="date" 
                    className={`form-control ${errors.nextAptDate ? 'input-error' : ''}`}
                    value={nextAptDate}
                    onChange={e => {
                      setNextAptDate(e.target.value);
                      if (errors.nextAptDate) setErrors(prev => ({ ...prev, nextAptDate: '' }));
                    }}
                    min={visitDate}
                  />
                  {errors.nextAptDate && <span className="error-text">{errors.nextAptDate}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Notes for Next Visit</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g. Re-evaluate lumbar extension pain, check compliance with bridges"
                    value={nextAptNotes}
                    onChange={e => setNextAptNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Clipboard size={18} /> Record Visit
            </button>
          </div>
        </form>
      </div>
      
      <style>{`
        .visit-modal {
          max-width: 700px !important;
        }

        .visit-form {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .duration-input-wrapper {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .btn-sm-preset {
          padding: 0.4rem 0.6rem !important;
          font-size: 0.75rem !important;
          border-radius: var(--radius-sm) !important;
        }

        .duration-quick-presets {
          display: flex;
          gap: 0.25rem;
        }

        .services-section {
          background-color: var(--bg-color);
          padding: 1rem;
          border-radius: var(--radius-md);
          border: 1px dashed var(--border-color);
          margin-bottom: 1.25rem;
        }

        .services-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .service-row-container {
          background-color: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 0.85rem;
          margin-bottom: 0.75rem;
          box-shadow: var(--shadow-sm);
        }

        .service-row-container:last-child {
          margin-bottom: 0;
        }

        .service-row-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          border-bottom: 1px solid var(--bg-color);
          padding-bottom: 0.25rem;
        }

        .service-index-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--primary);
        }

        .delete-row-btn {
          color: var(--danger) !important;
          padding: 0.25rem !important;
        }

        .delete-row-btn:hover {
          background-color: var(--danger-light) !important;
        }

        .service-fields-grid {
          gap: 0.5rem !important;
        }

        .margin-top-sm {
          margin-top: 0.5rem;
          margin-bottom: 0;
        }

        .appointment-toggle-wrapper {
          margin-bottom: 1rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
        }

        .checkbox-label input {
          width: 16px;
          height: 16px;
          accent-color: var(--primary);
        }

        .appointment-fields {
          background-color: var(--primary-light);
          padding: 1rem;
          border-radius: var(--radius-md);
          margin-bottom: 1rem;
          border: 1px solid var(--primary);
        }

        .fade-in-anim {
          animation: slideInDown 0.25s ease-out;
        }

        .btn-sm {
          padding: 0.4rem 0.75rem !important;
          font-size: 0.8rem !important;
          border-radius: var(--radius-sm) !important;
        }
      `}</style>
    </div>
  );
}
