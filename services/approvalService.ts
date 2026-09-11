import { apiFetch } from '@/lib/api';
import type { PendingApproval, RequestDetail } from '@/types';

export const listPendingApprovals = () => apiFetch<PendingApproval[]>('/approvals/pending');

export const getPendingCount = () => apiFetch<{ count: number }>('/approvals/pending/count');

export const approveStep = (stepId: number, comment?: string) =>
  apiFetch<RequestDetail>(`/approvals/${stepId}/approve`, { method: 'POST', body: { comment } });

export const rejectStep = (stepId: number, comment: string) =>
  apiFetch<RequestDetail>(`/approvals/${stepId}/reject`, { method: 'POST', body: { comment } });
