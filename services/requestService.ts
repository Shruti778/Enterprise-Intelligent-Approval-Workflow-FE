import { apiFetch } from '@/lib/api';
import type {
  AuditEntry,
  RequestDetail,
  RequestStats,
  RequestSummary,
  RequestType,
} from '@/types';

export interface CreateRequestPayload {
  type: RequestType;
  title: string;
  description?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
}

export function listRequests(params: { mine?: boolean; status?: string; type?: string } = {}) {
  const query = new URLSearchParams();
  if (params.mine) query.set('mine', 'true');
  if (params.status) query.set('status', params.status);
  if (params.type) query.set('type', params.type);
  const suffix = query.toString() ? `?${query}` : '';
  return apiFetch<RequestSummary[]>(`/requests${suffix}`);
}

export const getRequest = (id: number | string) => apiFetch<RequestDetail>(`/requests/${id}`);

export const createRequest = (payload: CreateRequestPayload) =>
  apiFetch<RequestDetail>('/requests', { method: 'POST', body: payload });

export const submitRequest = (id: number | string) =>
  apiFetch<RequestDetail>(`/requests/${id}/submit`, { method: 'POST' });

export const resubmitRequest = (id: number | string) =>
  apiFetch<RequestDetail>(`/requests/${id}/resubmit`, { method: 'POST' });

export const getStats = () => apiFetch<RequestStats>('/requests/stats');

export const getAuditTrail = (id: number | string) => apiFetch<AuditEntry[]>(`/requests/${id}/audit`);
