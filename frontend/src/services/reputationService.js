import api from './api';

export const createVouch = async (vouchData) => {
  const response = await api.post('/reputation/vouch', vouchData);
  return response.data;
};

export const getUserReputation = async (userId) => {
  const response = await api.get(`/reputation/${userId}`);
  return response.data;
};

export const getUserVouches = async (userId, limit = 20, skip = 0) => {
  const response = await api.get(`/reputation/vouches/${userId}`, {
    params: { limit, skip }
  });
  return response.data;
};

export const getReputationTransactions = async (userId, limit = 50, skip = 0) => {
  const response = await api.get(`/reputation/transactions/${userId}`, {
    params: { limit, skip }
  });
  return response.data;
};

export const getReputationLeaderboard = async (limit = 10, skillCategory = null) => {
  const params = { limit };
  if (skillCategory) {
    params.skillCategory = skillCategory;
  }
  const response = await api.get('/reputation/leaderboard', { params });
  return response.data;
};

export const verifyVouch = async (vouchId) => {
  const response = await api.patch(`/reputation/vouch/${vouchId}/verify`);
  return response.data;
};
