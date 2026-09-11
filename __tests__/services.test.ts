import { apiFetch } from '@/lib/api';
import {
  createRequest,
  getRequest,
  listRequests,
  resubmitRequest,
  submitRequest,
} from '@/services/requestService';
import {
  approveStep,
  listPendingApprovals,
  rejectStep,
} from '@/services/approvalService';
import { simulateWorkflow } from '@/services/workflowService';
import { fetchProfile } from '@/services/authService';
import { pendingApproval, requestDetail, requestSummary, simulation } from '../test-utils/fixtures';

jest.mock('@/lib/api', () => ({ apiFetch: jest.fn() }));

const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('Request service', () => {
  it('fetches the signed-in user profile', async () => {
    mockedApiFetch.mockResolvedValue({ id: 1, role: 'EMPLOYEE' });

    await fetchProfile();

    expect(mockedApiFetch).toHaveBeenCalledWith('/auth/me');
  });

  it('lists requests and returns them unchanged', async () => {
    const requests = [requestSummary()];
    mockedApiFetch.mockResolvedValue(requests);

    await expect(listRequests()).resolves.toEqual(requests);
    expect(mockedApiFetch).toHaveBeenCalledWith('/requests');
  });

  it('narrows the list to the caller\'s own requests with filters', async () => {
    mockedApiFetch.mockResolvedValue([]);

    await listRequests({ mine: true, status: 'IN_REVIEW', type: 'LAPTOP' });

    expect(mockedApiFetch).toHaveBeenCalledWith('/requests?mine=true&status=IN_REVIEW&type=LAPTOP');
  });

  it('creates a request with the payload the form collected', async () => {
    const payload = {
      type: 'LAPTOP' as const,
      title: 'MacBook Pro M3 Max',
      amount: 200_000,
      metadata: { newVendor: true, urgency: 'HIGH' },
    };
    mockedApiFetch.mockResolvedValue(requestDetail());

    await createRequest(payload);

    expect(mockedApiFetch).toHaveBeenCalledWith('/requests', { method: 'POST', body: payload });
  });

  it('submits and resubmits a request by id', async () => {
    mockedApiFetch.mockResolvedValue(requestDetail());

    await submitRequest(12);
    await resubmitRequest(12);

    expect(mockedApiFetch).toHaveBeenNthCalledWith(1, '/requests/12/submit', { method: 'POST' });
    expect(mockedApiFetch).toHaveBeenNthCalledWith(2, '/requests/12/resubmit', { method: 'POST' });
  });

  it('propagates an API failure to the caller', async () => {
    mockedApiFetch.mockRejectedValue(new Error('Only a DRAFT request can be submitted'));

    await expect(submitRequest(12)).rejects.toThrow('Only a DRAFT request can be submitted');
  });

  it('fetches a single request by id', async () => {
    mockedApiFetch.mockResolvedValue(requestDetail());

    await getRequest(5);

    expect(mockedApiFetch).toHaveBeenCalledWith('/requests/5');
  });
});

describe('Approval service', () => {
  it('fetches the pending approval queue', async () => {
    mockedApiFetch.mockResolvedValue([pendingApproval()]);

    await expect(listPendingApprovals()).resolves.toHaveLength(1);
    expect(mockedApiFetch).toHaveBeenCalledWith('/approvals/pending');
  });

  it('approves a step, passing the optional comment through', async () => {
    mockedApiFetch.mockResolvedValue(requestDetail());

    await approveStep(9, 'Budget confirmed.');

    expect(mockedApiFetch).toHaveBeenCalledWith('/approvals/9/approve', {
      method: 'POST',
      body: { comment: 'Budget confirmed.' },
    });
  });

  it('rejects a step with its mandatory comment', async () => {
    mockedApiFetch.mockResolvedValue(requestDetail({ status: 'REJECTED' }));

    await rejectStep(9, 'Quote is not justified.');

    expect(mockedApiFetch).toHaveBeenCalledWith('/approvals/9/reject', {
      method: 'POST',
      body: { comment: 'Quote is not justified.' },
    });
  });
});

describe('Workflow service', () => {
  it('posts a hypothetical request to the simulator endpoint', async () => {
    mockedApiFetch.mockResolvedValue(simulation());

    const result = await simulateWorkflow({
      type: 'LAPTOP',
      amount: 200_000,
      metadata: { newVendor: true, urgency: 'HIGH' },
    });

    expect(mockedApiFetch).toHaveBeenCalledWith('/workflow/simulate', {
      method: 'POST',
      body: { type: 'LAPTOP', amount: 200_000, metadata: { newVendor: true, urgency: 'HIGH' } },
    });
    expect(result.workflow.path).toEqual(['MANAGER', 'FINANCE', 'COMPLIANCE', 'DIRECTOR']);
  });
});
