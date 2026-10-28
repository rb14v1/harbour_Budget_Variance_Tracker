import { api, data } from './client';

export const budgetsApi = {
  list: (params) => data(api.get('/budgets', { params })),
  get: (id) => data(api.get(`/budgets/${id}`)),
  create: (body) => data(api.post('/budgets', body)),
  updateLines: (id, lines) => data(api.put(`/budgets/${id}`, { lines })),
  submit: (id, comment) => data(api.post(`/budgets/${id}/submit`, { comment })),
  approve: (id, comment) => data(api.post(`/budgets/${id}/approve`, { comment })),
  reject: (id, comment) => data(api.post(`/budgets/${id}/reject`, { comment })),
  revise: (id) => data(api.post(`/budgets/${id}/revise`)),
};

export const actualsApi = {
  list: (params) => data(api.get('/actuals', { params })),
  create: (body) => data(api.post('/actuals', body)),
  update: (id, body) => data(api.put(`/actuals/${id}`, body)),
  remove: (id) => api.delete(`/actuals/${id}`),
};

export const importsApi = {
  list: (params) => data(api.get('/imports', { params })),
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return data(api.post('/imports', form));
  },
  revert: (id) => data(api.delete(`/imports/${id}`)),
  templateUrl: '/api/v1/imports/template',
};

export const reportsApi = {
  variance: (params) => data(api.get('/reports/variance', { params })),
  exportUrl: (params) => `/api/v1/reports/variance/export?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))}`,
};

export const dashboardApi = {
  summary: (params) => data(api.get('/dashboard/summary', { params })),
};

export const alertsApi = {
  rules: () => data(api.get('/alert-rules')),
  upsertRule: (body) => data(api.put('/alert-rules', body)),
  deleteRule: (id) => api.delete(`/alert-rules/${id}`),
};

export const notificationsApi = {
  list: (params) => data(api.get('/notifications', { params })),
  markRead: (id) => data(api.patch(`/notifications/${id}/read`)),
  markAllRead: () => data(api.post('/notifications/read-all')),
};

export const adminApi = {
  users: (params) => data(api.get('/users', { params })),
  createUser: (body) => data(api.post('/users', body)),
  updateUser: (id, body) => data(api.patch(`/users/${id}`, body)),
  departments: (params) => data(api.get('/departments', { params })),
  createDepartment: (body) => data(api.post('/departments', body)),
  updateDepartment: (id, body) => data(api.patch(`/departments/${id}`, body)),
  categories: (params) => data(api.get('/categories', { params })),
  createCategory: (body) => data(api.post('/categories', body)),
  updateCategory: (id, body) => data(api.patch(`/categories/${id}`, body)),
};
