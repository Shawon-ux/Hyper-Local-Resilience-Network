import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const extractErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data;

  if (typeof responseData?.message === 'string' && responseData.message.trim()) {
    return responseData.message;
  }

  if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
    const first = responseData.errors[0];
    if (typeof first?.msg === 'string' && first.msg.trim()) return first.msg;
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getCurrentUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (error) {
      setUser(null);
      return {
        success: false,
        error: extractErrorMessage(error, 'Failed to fetch user'),
      };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentUser();
  }, []);

  const login = async (credentials) => {
    try {
      const { data } = await api.post('/auth/login', credentials);

      if (data?.token) {
        localStorage.setItem('token', data.token);
      }

      setUser(data.user);

      return { success: true, user: data.user };
    } catch (error) {
      return {
        success: false,
        error: extractErrorMessage(error, 'Login failed'),
      };
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await api.post('/auth/register', userData);

      if (data?.token) {
        localStorage.setItem('token', data.token);
      }

      setUser(data.user);

      return { success: true, user: data.user };
    } catch (error) {
      return {
        success: false,
        error: extractErrorMessage(error, 'Registration failed'),
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // ignore logout request failure
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }

    return { success: true };
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      getCurrentUser,
      refreshUser: getCurrentUser,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}