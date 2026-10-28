import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, alertsApi, notificationsApi } from '../api/resources';

export function useDepartments(includeInactive = false) {
  return useQuery({
    queryKey: ['departments', includeInactive],
    queryFn: () => adminApi.departments(includeInactive ? { includeInactive: 'true' } : {}),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategories(includeInactive = false) {
  return useQuery({
    queryKey: ['categories', includeInactive],
    queryFn: () => adminApi.categories(includeInactive ? { includeInactive: 'true' } : {}),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAlertRules() {
  return useQuery({ queryKey: ['alert-rules'], queryFn: alertsApi.rules, staleTime: 60 * 1000 });
}

export function useNotifications(params = { limit: 20 }) {
  return useQuery({ queryKey: ['notifications', params], queryFn: () => notificationsApi.list(params), refetchInterval: 60 * 1000 });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => (id ? notificationsApi.markRead(id) : notificationsApi.markAllRead()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
