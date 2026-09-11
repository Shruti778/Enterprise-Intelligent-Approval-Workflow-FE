import userEvent from '@testing-library/user-event';
import ApprovalsPage from '@/app/(app)/approvals/page';
import ApprovalReviewPage from '@/app/(app)/approvals/[stepId]/page';
import { approveStep, listPendingApprovals, rejectStep } from '@/services/approvalService';
import { getRequest } from '@/services/requestService';
import { setParams } from '../test-utils/navigation';
import { renderWithAuth, screen, waitFor, within } from '../test-utils/render';
import { highRiskSteps, pendingApproval, requestDetail, requestSummary, user } from '../test-utils/fixtures';

jest.mock('@/services/approvalService');
jest.mock('@/services/requestService');

const mockedListPending = listPendingApprovals as jest.MockedFunction<typeof listPendingApprovals>;
const mockedApprove = approveStep as jest.MockedFunction<typeof approveStep>;
const mockedReject = rejectStep as jest.MockedFunction<typeof rejectStep>;
const mockedGetRequest = getRequest as jest.MockedFunction<typeof getRequest>;

describe('Approval queue', () => {
  const renderQueue = (role: Parameters<typeof user>[0] = 'MANAGER') =>
    renderWithAuth(<ApprovalsPage />, { as: user(role) });

  it('lists the requests waiting on the signed-in approver', async () => {
    mockedListPending.mockResolvedValue([pendingApproval()]);
    renderQueue();

    expect(await screen.findByText('REQ-1001')).toBeInTheDocument();
    const row = screen.getByText('REQ-1001').closest('tr') as HTMLElement;
    expect(within(row).getByText('Aarav Sharma')).toBeInTheDocument();
    expect(within(row).getByText('₹2,00,000')).toBeInTheDocument();
    expect(within(row).getByText('HIGH')).toBeInTheDocument();
    expect(within(row).getByText('Manager Approval')).toBeInTheDocument();
  });

  it('links each queued request through to its review screen', async () => {
    mockedListPending.mockResolvedValue([pendingApproval({ stepId: 77 })]);
    renderQueue();

    expect(await screen.findByRole('link', { name: /review/i })).toHaveAttribute(
      'href',
      '/approvals/77'
    );
  });

  it('shows the queue belonging to the signed-in role, not another role\'s', async () => {
    mockedListPending.mockResolvedValue([
      pendingApproval({ stepId: 5, approverRole: 'FINANCE', stepName: 'Finance Review' }),
    ]);
    renderQueue('FINANCE');

    expect(await screen.findByText(/actionable FINANCE step/i)).toBeInTheDocument();
    expect(screen.getByText('Finance Review')).toBeInTheDocument();
  });

  it('summarises how many decisions and how many are high risk', async () => {
    mockedListPending.mockResolvedValue([
      pendingApproval({ stepId: 1 }),
      pendingApproval({
        stepId: 2,
        request: requestSummary({ id: 2, requestNumber: 'REQ-1002', risk: null }),
      }),
    ]);
    renderQueue();

    await screen.findByText('REQ-1001');
    const awaiting = screen.getByText(/awaiting your decision/i).closest('div') as HTMLElement;
    expect(within(awaiting).getByText('2')).toBeInTheDocument();
    const highRisk = screen.getByText(/^high risk$/i).closest('div') as HTMLElement;
    expect(within(highRisk).getByText('1')).toBeInTheDocument();
  });

  it('shows a loading state before the queue arrives', () => {
    mockedListPending.mockReturnValue(new Promise(() => {}));
    renderQueue();

    expect(screen.getByText(/loading approval queue/i)).toBeInTheDocument();
  });

  it('tells the approver when nothing is waiting on them', async () => {
    mockedListPending.mockResolvedValue([]);
    renderQueue();

    expect(await screen.findByText(/nothing is waiting on you right now/i)).toBeInTheDocument();
  });

  it('surfaces a failure to load the queue', async () => {
    mockedListPending.mockRejectedValue(new Error('Unable to load your approval queue'));
    renderQueue();

    expect(await screen.findByText('Unable to load your approval queue')).toBeInTheDocument();
  });
});

describe('Approval review', () => {
  const renderReview = (role: Parameters<typeof user>[0] = 'MANAGER') => {
    setParams({ stepId: '1' });
    return renderWithAuth(<ApprovalReviewPage />, { as: user(role) });
  };

  beforeEach(() => {
    mockedListPending.mockResolvedValue([pendingApproval({ stepId: 1 })]);
    mockedGetRequest.mockResolvedValue(requestDetail());
  });

  it('opens the request under review with its risk and workflow', async () => {
    renderReview();

    expect(await screen.findByRole('heading', { name: /MacBook Pro M3 Max/i })).toBeInTheDocument();
    expect(screen.getByText('₹2,00,000')).toBeInTheDocument();
    const risk = screen.getByRole('heading', { name: /risk assessment/i }).closest('section')!;
    expect(within(risk as HTMLElement).getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('Laptop - High Risk Approval')).toBeInTheDocument();
  });

  it('approves the step and reflects the advanced workflow', async () => {
    mockedApprove.mockResolvedValue(
      requestDetail({
        currentStage: 'Finance Review',
        workflow: {
          ...requestDetail().workflow!,
          currentStep: 2,
          steps: highRiskSteps(['APPROVED', 'PENDING', 'WAITING', 'WAITING']),
        },
      })
    );
    renderReview();
    await screen.findByRole('heading', { name: /MacBook Pro M3 Max/i });

    await userEvent.type(screen.getByLabelText(/comment/i), 'Justified for the ML roadmap.');
    await userEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() =>
      expect(mockedApprove).toHaveBeenCalledWith(1, 'Justified for the ML roadmap.')
    );
    expect(await screen.findByText(/step approved/i)).toHaveTextContent(/IN REVIEW/i);
    expect(screen.getByText(/now with: finance review/i)).toBeInTheDocument();
    // The decision panel closes once the step has been acted on.
    expect(screen.queryByRole('button', { name: /^approve$/i })).not.toBeInTheDocument();
  });

  it('reports the completed workflow when the final approval lands', async () => {
    mockedApprove.mockResolvedValue(
      requestDetail({
        status: 'APPROVED',
        currentStage: 'Completed',
        workflow: {
          ...requestDetail().workflow!,
          status: 'APPROVED',
          currentStep: null,
          steps: highRiskSteps(['APPROVED', 'APPROVED', 'APPROVED', 'APPROVED']),
        },
      })
    );
    renderReview('DIRECTOR');
    await screen.findByRole('heading', { name: /MacBook Pro M3 Max/i });

    await userEvent.click(screen.getByRole('button', { name: /approve/i }));

    expect(await screen.findByText(/step approved/i)).toHaveTextContent(/APPROVED/);
    expect(screen.getByText(/the workflow has completed/i)).toBeInTheDocument();
  });

  it('rejects the request with the approver\'s comment', async () => {
    mockedReject.mockResolvedValue(
      requestDetail({
        status: 'REJECTED',
        workflow: {
          ...requestDetail().workflow!,
          status: 'REJECTED',
          steps: highRiskSteps(['REJECTED', 'SKIPPED', 'SKIPPED', 'SKIPPED']),
        },
      })
    );
    renderReview();
    await screen.findByRole('heading', { name: /MacBook Pro M3 Max/i });

    await userEvent.type(screen.getByLabelText(/comment/i), 'Not budgeted for this quarter.');
    await userEvent.click(screen.getByRole('button', { name: /reject/i }));

    await waitFor(() =>
      expect(mockedReject).toHaveBeenCalledWith(1, 'Not budgeted for this quarter.')
    );
    expect(await screen.findByText(/step rejected/i)).toHaveTextContent(/REJECTED/);
  });

  it('will not reject without a comment', async () => {
    renderReview();
    await screen.findByRole('heading', { name: /MacBook Pro M3 Max/i });

    await userEvent.click(screen.getByRole('button', { name: /reject/i }));

    expect(await screen.findByText(/a comment is required when rejecting/i)).toBeInTheDocument();
    expect(mockedReject).not.toHaveBeenCalled();
  });

  it('surfaces a failed approval instead of claiming success', async () => {
    mockedApprove.mockRejectedValue(
      new Error('This step requires the FINANCE role; you are signed in as MANAGER')
    );
    renderReview();
    await screen.findByRole('heading', { name: /MacBook Pro M3 Max/i });

    await userEvent.click(screen.getByRole('button', { name: /approve/i }));

    expect(
      await screen.findByText(/this step requires the FINANCE role/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/step approved/i)).not.toBeInTheDocument();
  });

  it('offers no decision controls for a step the approver does not hold', async () => {
    // The backend leaves the step out of this user's queue, so the page has nothing to act on.
    mockedListPending.mockResolvedValue([]);
    renderReview('FINANCE');

    expect(await screen.findByText(/no longer waiting on you/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^approve$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^reject$/i })).not.toBeInTheDocument();
  });

  it('shows the decisions earlier approvers already recorded', async () => {
    mockedGetRequest.mockResolvedValue(
      requestDetail({
        workflow: {
          ...requestDetail().workflow!,
          steps: highRiskSteps(['APPROVED', 'PENDING', 'WAITING', 'WAITING']).map((step, index) =>
            index === 0
              ? {
                  ...step,
                  actions: [
                    {
                      id: 1,
                      action: 'APPROVED' as const,
                      comment: 'Justified for the ML roadmap.',
                      createdAt: '2026-09-01T10:00:00.000Z',
                      actor: {
                        id: 2,
                        name: 'Priya Nair',
                        email: 'manager@company.com',
                        role: 'MANAGER',
                      },
                    },
                  ],
                }
              : step
          ),
        },
      })
    );
    renderReview('FINANCE');

    const history = (await screen.findByRole('heading', { name: /previous approval actions/i }))
      .closest('section') as HTMLElement;
    expect(within(history).getByText('1 recorded')).toBeInTheDocument();
    expect(within(history).getAllByText(/Justified for the ML roadmap\./).length).toBeGreaterThan(0);
  });
});
