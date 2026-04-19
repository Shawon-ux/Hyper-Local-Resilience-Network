import api from './api';

export const analyzeTaskDescription = async (description) => {
  const response = await api.post('/tasks/analyze', { description });
  return response.data;
};

export const createMicroTask = async (taskData) => {
  const response = await api.post('/microtasks', taskData);
  return response.data;
};

export const fetchMyTasks = async () => {
  const response = await api.get('/microtasks/my-tasks');
  return response.data;
};

export const updateMyTask = async (taskId, updateData) => {
  const response = await api.patch(`/microtasks/${taskId}`, updateData);
  return response.data;
};

export const deleteMyTask = async (taskId) => {
  const response = await api.delete(`/microtasks/${taskId}`);
  return response.data;
};
