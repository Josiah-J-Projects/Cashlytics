import React from 'react'
import { X } from 'lucide-react'

export function Modal({ title, onClose, children, footer }) {
  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="modalBackdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modalHeader">
          <h2 className="modalTitle">{title}</h2>
          <button className="btn btnGhost btnIcon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modalBody">{children}</div>
        {footer && <div className="modalFooter">{footer}</div>}
      </div>
    </div>
  )
}

export function FormGroup({ label, children, hint }) {
  return (
    <div className="formGroup">
      {label && <label>{label}</label>}
      {children}
      {hint && <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}
