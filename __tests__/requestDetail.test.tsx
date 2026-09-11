import RequestDetailPage from '@/app/(app)/requests/[id]/page';
import { getAuditTrail, getRequest } from '@/services/requestService';
import { setParams } from '../test-utils/navigation';
import { renderWithAuth, screen, within } from '../test-utils/render';
import { highRiskSteps, requestDetail, step, user } from '../test-utils/fixtures';

jest.mock('@/services/requestService');

const mockedGetRequest = getRequest as jest.MockedFunction<typeof getRequest>;
const mockedGetAudit = getAuditTrail as jest.MockedFunction<typeof getAuditTrail>;

const renderPage = () => {
  setParams({ id: '1' });
  return renderWithAuth(<RequestDetailPage />, { as: user('EMPLOYEE') });
};

const timeline = () =>
  screen.getByRole('heading', { name: /approval timeline/i }).closest('section') as HTMLElement;

/** The ordered list of stages inside the timeline card, without its header. */
const chain = () => within(timeline()).getByRole('list');

const stepNames = () =>
  within(chain())
    .getAllByText(/^(Manager|Finance|Compliance|Director)\b/)
    .map((node) => node.textContent);

const stepStatuses = () =>
  within(chain())
    .getAllByText(/^(Approved|Pending|Waiting|Rejected|Skipped)/)
    .map((node) => node.textContent);

beforeEach(() => {
  mockedGetAudit.mockResolvedValue([
    {
      id: 1,
      action: 'REQUEST_SUBMITTED',
      entityType: 'REQUEST',
      entityId: 1,
      metadata: {},
      createdAt: '2026-09-01T09:00:00.000Z',
      user: { id: 1, name: 'Aarav Sharma', email: 'employee@company.com' },
    },
  ]);
});

describe('Request details', () => {
  it('shows the request identity, amount and status', async () => {
    mockedGetRequest.mockResolvedValue(requestDetail());
    renderPage();

    expect(await screen.findByRole('heading', { name: /MacBook Pro M3 Max/i })).toBeInTheDocument();
    expect(screen.getAllByText('REQ-1001').length).toBeGreaterThan(0);
    expect(screen.getByText('₹2,00,000')).toBeInTheDocument();
    expect(screen.getByText('IN REVIEW')).toBeInTheDocument();
  });

  it('shows the risk level with the factors that explain it', async () => {
    mockedGetRequest.mockResolvedValue(requestDetail());
    renderPage();

    const risk = (await screen.findByRole('heading', { name: /risk assessment/i })).closest(
      'section'
    ) as HTMLElement;
    expect(within(risk).getByText('HIGH')).toBeInTheDocument();
    expect(within(risk).getByText('65/100')).toBeInTheDocument();
    expect(within(risk).getByText('High amount')).toBeInTheDocument();
    expect(within(risk).getByText('New vendor')).toBeInTheDocument();
  });

  it('renders the whole approval chain in order', async () => {
    mockedGetRequest.mockResolvedValue(requestDetail());
    renderPage();

    await screen.findByRole('heading', { name: /MacBook Pro M3 Max/i });

    expect(stepNames()).toEqual([
      'Manager Approval',
      'Finance Review',
      'Compliance Review',
      'Director Sign-off',
    ]);
  });

  it('marks the stage the request is currently waiting on', async () => {
    mockedGetRequest.mockResolvedValue(
      requestDetail({
        currentStage: 'Finance Review',
        workflow: {
          ...requestDetail().workflow!,
          currentStep: 2,
          steps: highRiskSteps(['APPROVED', 'PENDING', 'WAITING', 'WAITING']),
        },
      })
    );
    renderPage();

    await screen.findByRole('heading', { name: /MacBook Pro M3 Max/i });

    // The header states the stage in words, and the timeline marks it as pending.
    expect(screen.getByText('Current stage').nextElementSibling).toHaveTextContent('Finance Review');
    expect(stepStatuses()).toEqual([
      expect.stringMatching(/^Approved/),
      'Pending',
      'Waiting',
      'Waiting',
    ]);
  });

  it('shows the decisions already recorded, with their comments', async () => {
    mockedGetRequest.mockResolvedValue(
      requestDetail({
        workflow: {
          ...requestDetail().workflow!,
          steps: [
            step('MANAGER', 'APPROVED', {
              id: 1,
              stepOrder: 1,
              approver: { id: 2, name: 'Priya Nair', role: 'MANAGER' },
              actions: [
                {
                  id: 1,
                  action: 'APPROVED',
                  comment: 'Justified for the ML roadmap.',
                  createdAt: '2026-09-01T10:00:00.000Z',
                  actor: { id: 2, name: 'Priya Nair', email: 'manager@company.com', role: 'MANAGER' },
                },
              ],
            }),
            step('FINANCE', 'PENDING', { id: 2, stepOrder: 2 }),
          ],
        },
      })
    );
    renderPage();

    await screen.findByRole('heading', { name: /MacBook Pro M3 Max/i });
    expect(within(timeline()).getByText('Justified for the ML roadmap.')).toBeInTheDocument();
    expect(within(timeline()).getByText(/Approved by Priya Nair/)).toBeInTheDocument();
  });

  it('shows the audit trail recorded for the request', async () => {
    mockedGetRequest.mockResolvedValue(requestDetail());
    renderPage();

    const audit = (await screen.findByRole('heading', { name: /audit trail/i })).closest(
      'section'
    ) as HTMLElement;
    expect(within(audit).getByText('Request submitted')).toBeInTheDocument();
  });

  it('offers submission on a draft that has not been scored yet', async () => {
    mockedGetRequest.mockResolvedValue(
      requestDetail({ status: 'DRAFT', risk: null, workflow: null, currentStage: 'Not submitted' })
    );
    renderPage();

    expect(await screen.findByRole('button', { name: /submit for approval/i })).toBeInTheDocument();
    expect(screen.getByText(/risk is calculated when the request is submitted/i)).toBeInTheDocument();
    expect(screen.getByText(/submit the request to generate its approval workflow/i)).toBeInTheDocument();
  });

  it('offers a resubmission on a rejected request', async () => {
    mockedGetRequest.mockResolvedValue(
      requestDetail({
        status: 'REJECTED',
        workflow: {
          ...requestDetail().workflow!,
          status: 'REJECTED',
          steps: highRiskSteps(['APPROVED', 'REJECTED', 'SKIPPED', 'SKIPPED']),
        },
      })
    );
    renderPage();

    expect(await screen.findByRole('button', { name: /resubmit/i })).toBeInTheDocument();
    expect(stepStatuses()).toEqual([
      expect.stringMatching(/^Approved/),
      expect.stringMatching(/^Rejected/),
      'Skipped',
      'Skipped',
    ]);
  });
});
