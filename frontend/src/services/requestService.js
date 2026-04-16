import api from './api';

export const createCriticalRequest = async (requestData) => {
  const response = await api.post('/requests', requestData);
  return response.data;
};

export const fetchCriticalRequests = async () => {
  const response = await api.get('/requests');
  return response.data;
};

export const fetchMyCriticalRequests = async () => {
  const response = await api.get('/requests/my-requests');
  return response.data;
};

export const approveCriticalRequest = async (requestId) => {
  const response = await api.patch(`/requests/${requestId}/approve`);
  return response.data;
};

export const rejectCriticalRequest = async (requestId) => {
  const response = await api.patch(`/requests/${requestId}/reject`);
  return response.data;
};

export const claimCriticalRequest = async (requestId) => {
  const response = await api.patch(`/requests/${requestId}/claim`);
  return response.data;
};

export const fulfillCriticalRequest = async (requestId) => {
  const response = await api.patch(`/requests/${requestId}/fulfill`);
  return response.data;
};
