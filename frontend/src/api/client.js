import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

export const UNAUTHORIZED_EVENT = 'session:unauthorized';

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(err);
  }
);

export function errorMessage(err) {
  const e = err?.response?.data?.error;
  if (!e) return err?.message || 'Something went wrong';
  if (e.details?.length && e.details[0]?.message) return `${e.message}: ${e.details.map((d) => d.message).join('; ')}`;
  return e.message;
}

export const data = (p) => p.then((r) => r.data);
