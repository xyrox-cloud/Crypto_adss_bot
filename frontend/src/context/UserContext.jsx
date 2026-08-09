import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../api/api';

const UserContext = createContext();

export const UserProvider = ({ children, initialUserData }) => {
  const [user, setUser] = useState(initialUserData || null);
  const [loading, setLoading] = useState(!initialUserData);

  const refreshUser = useCallback(async () => {
    try {
      const res = await getMe();
      setUser(res.data);
    } catch (err) {
      console.error('Failed to refresh user', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialUserData) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [initialUserData, refreshUser]);

  return (
    <UserContext.Provider value={{ user, setUser, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
