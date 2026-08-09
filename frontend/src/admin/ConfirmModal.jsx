import React, { useState } from 'react';

/**
 * Confirmation modal for destructive / financial actions.
 *
 * Props:
 *  title       string
 *  description string | ReactNode
 *  onConfirm   async () => void
 *  onCancel    () => void
 *  confirmLabel string  (default "Confirm")
 *  danger      bool     (red confirm button)
 *  extraFields [{key, label, placeholder, type?, required?}]  optional form fields
 */
export default function ConfirmModal({
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  danger = false,
  extraFields = [],
}) {
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState(
    Object.fromEntries(extraFields.map(f => [f.key, f.defaultValue ?? '']))
  );
  const [err, setErr] = useState('');

  const handleConfirm = async () => {
    // Validate required fields
    for (const f of extraFields) {
      if (f.required && !String(values[f.key]).trim()) {
        setErr(`"${f.label}" is required`);
        return;
      }
    }
    setErr('');
    setLoading(true);
    try {
      await onConfirm(values);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (key, val) => setValues(v => ({ ...v, [key]: val }));

  return (
    <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="admin-modal">
        <div className="admin-modal-title">{title}</div>
        <div className="admin-modal-desc">{description}</div>

        {extraFields.map(f => (
          <div className="admin-modal-field" key={f.key}>
            <label className="admin-modal-label">{f.label}{f.required && ' *'}</label>
            {f.type === 'textarea' ? (
              <textarea
                className="admin-modal-input"
                rows={3}
                placeholder={f.placeholder || ''}
                value={values[f.key]}
                onChange={e => set(f.key, e.target.value)}
                style={{ resize: 'vertical', minHeight: 70 }}
              />
            ) : (
              <input
                className="admin-modal-input"
                type={f.type || 'text'}
                placeholder={f.placeholder || ''}
                value={values[f.key]}
                onChange={e => set(f.key, e.target.value)}
                step={f.step}
              />
            )}
            {f.hint && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>{f.hint}</div>}
          </div>
        ))}

        {err && (
          <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 12, background: 'var(--error-sub)', padding: '8px 12px', borderRadius: 8 }}>
            {err}
          </div>
        )}

        <div className="admin-modal-actions">
          <button className="a-btn a-btn-ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            className={`a-btn ${danger ? 'a-btn-danger' : 'a-btn-primary'}`}
            onClick={handleConfirm}
            disabled={loading}
            style={{ minWidth: 110 }}
          >
            {loading ? <span className="a-spinner" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
