import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';

// API Response type (aligned with server/src/middleware/auth.ts)
interface UserInfo {
  id: number;
  uid: string;
  name: string;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'DISABLED' | 'DELETED';
  hourlyRate?: number;
}

export const useUserStatus = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['userStatus'],
    queryFn: async () => {
      const res = await api.get<UserInfo>('/users/me');
      return res.data;
    },
    enabled,
    refetchInterval: 10000, // Poll every 10 seconds
    retry: false, // Don't retry on 403
  });
};
