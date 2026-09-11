import { apiFetch } from '@/lib/api';
import type { RequestType, SimulationResult, WorkflowDefinitionRecord } from '@/types';

export const simulateWorkflow = (payload: {
  type: RequestType;
  amount: number;
  metadata: Record<string, unknown>;
}) => apiFetch<SimulationResult>('/workflow/simulate', { method: 'POST', body: payload });

export const listWorkflowDefinitions = () =>
  apiFetch<WorkflowDefinitionRecord[]>('/workflow/definitions');
