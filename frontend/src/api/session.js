import { api, data } from './client';

export const sessionApi = {
  login: (email, password) => data(api.post('/auth/login', { email, password })),
  logout: () => api.post('/auth/logout'),
  me: () => data(api.get('/auth/me')),
};
