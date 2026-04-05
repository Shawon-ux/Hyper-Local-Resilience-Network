const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:1543/api';

// Helper function to handle fetch requests
const request = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    credentials: 'include', // Important: sends cookies (JWT) automatically
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw { status: response.status, message: data.message || 'Something went wrong' };
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Auth endpoints
export const register = (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
export const login = (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
export const logout = () => request('/auth/logout', { method: 'POST' });

// Protected endpoints (example – you can add more later)
export const getCurrentUser = () => request('/auth/me'); // we'll add this route later if needed