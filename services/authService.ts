import { apiFetch } from '@/lib/api';
import type { AuthUser } from '@/types';

export const fetchProfile = () => apiFetch<AuthUser>('/auth/me');
