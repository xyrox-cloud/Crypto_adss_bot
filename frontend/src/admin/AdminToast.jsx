import React, { createContext, useContext, useState, useCallback } from 'react';

const AdminToastCtx = createContext(null);

let toastId = 0;

export function AdminToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  return (
    <AdminToastCtx.Provider value={addToast}>
      {children}
      <div className="admin-toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`admin-toast admin-toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </AdminToastCtx.Provider>
  );
}

export function useAdminToast() {
  return useContext(AdminToastCtx);
}
