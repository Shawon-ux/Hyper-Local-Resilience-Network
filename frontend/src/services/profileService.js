import api from './api';

export const fetchProfile = () => api.get('/skills/my-profile');
export const saveProfile = (skills) => api.put('/skills/profile', { skills });
export const bulkUpdateSkills = (skillIds, action) => api.put('/skills/batch', { skillIds, action });
