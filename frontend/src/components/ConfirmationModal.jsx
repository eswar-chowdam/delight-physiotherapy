import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmationModal({ 
  isOpen, 
  title = 'Are you sure?', 
  message = 'This action cannot be easily undone.', 
  onConfirm, 
  onCancel, 
  confirmText = 'Yes, Delete', 
  cancelText = 'Cancel',
  isDanger = true 
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-container confirmation-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="confirm-title-area">
            {isDanger && <AlertTriangle className="warn-icon" />}
            <h3>{title}</h3>
          </div>
          <button className="btn-icon" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>
        
        <div className="modal-body">
          <p className="confirm-message">{message}</p>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button 
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
      
      <style>{`
        .confirmation-modal {
          max-width: 450px !important;
          border-left: 4px solid var(--danger);
        }
        
        .confirm-title-area {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .warn-icon {
          color: var(--danger);
          animation: shake 0.5s ease-in-out;
        }

        .confirm-message {
          color: var(--text-main);
          font-size: 0.95rem;
          line-height: 1.5;
          white-space: pre-line;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
