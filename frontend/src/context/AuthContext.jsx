/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import { login as loginApi, register as registerApi, logout as logoutApi } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [error, setError] = useState(null);

  const register = async (userData) => {
    setError(null);
    try {
      const data = await registerApi(userData);
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      return { success: true };
    } catch (err) {
      setError(err.message || 'Registration failed');
      return { success: false, error: err.message };
    }
  };

  const login = async (credentials) => {
    setError(null);
    try {
      const data = await loginApi(credentials);
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      return { success: true };
    } catch (err) {
      setError(err.message || 'Login failed');
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await logoutApi();
      setUser(null);
      localStorage.removeItem('user');
    } catch (err) {
      console.error('Logout error:', err);
      setUser(null);
      localStorage.removeItem('user');
    }
  };

  const value = {
    user,
    error,
    register,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};