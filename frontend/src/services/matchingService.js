import api from './api';

export const fetchMyRequestMatches = async () => {
  const response = await api.get('/matching/my-requests');
  return response.data;
};

export const fetchRequestMatches = async (requestId) => {
  const response = await api.get(`/matching/request/${requestId}/offers`);
  return response.data;
};
