import userEvent from '@testing-library/user-event';
import RequestsPage from '@/app/(app)/requests/page';
import DashboardPage from '@/app/(app)/dashboard/page';
import { getStats, listRequests } from '@/services/requestService';
import { listPendingApprovals } from '@/services/approvalService';
import { renderWithAuth, screen, within } from '../test-utils/render';
import { pendingApproval, requestSummary, user } from '../test-utils/fixtures';

jest.mock('@/services/requestService');
jest.mock('@/services/approvalService');

const mockedList = listRequests as jest.MockedFunction<typeof listRequests>;
const mockedStats = getStats as jest.MockedFunction<typeof getStats>;
const mockedPending = listPendingApprovals as jest.MockedFunction<typeof listPendingApprovals>;

const stats = { total: 1, draft: 0, pending: 1, approved: 0, rejected: 0 };
const never = () => new Promise<never>(() => {});

describe('My Requests - loading, error and empty states', () => {
  const renderPage = () => renderWithAuth(<RequestsPage />, { as: user('EMPLOYEE') });

  it('shows a loading indicator while the list is being fetched', () => {
    mockedList.mockReturnValue(never());
    renderPage();

    expect(screen.getByText(/loading requests/i)).toBeInTheDocument();
  });

  it('shows the API error message when the list fails to load', async () => {
    mockedList.mockRejectedValue(new Error('Unable to load requests'));
    renderPage();

    expect(await screen.findByText('Unable to load requests')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows an empty state when the user has raised nothing yet', async () => {
    mockedList.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText(/no requests match these filters/i)).toBeInTheDocument();
    expect(screen.getByText('0 of 0')).toBeInTheDocument();
  });

  it('lists the requests with their risk and stage once loaded', async () => {
    mockedList.mockResolvedValue([requestSummary()]);
    renderPage();

    const row = (await screen.findByText('REQ-1001')).closest('tr') as HTMLElement;
    expect(within(row).getByText('HIGH')).toBeInTheDocument();
    expect(within(row).getByText('IN REVIEW')).toBeInTheDocument();
    expect(within(row).getByText('Manager Approval')).toBeInTheDocument();
    expect(screen.getByText('1 of 1')).toBeInTheDocument();
  });

  it('shows the empty state again when a filter matches nothing', async () => {
    mockedList.mockResolvedValue([requestSummary()]);
    renderPage();
    await screen.findByText('REQ-1001');

    await userEvent.selectOptions(screen.getByDisplayValue('All statuses'), 'APPROVED');

    expect(screen.getByText(/no requests match these filters/i)).toBeInTheDocument();
    expect(screen.getByText('0 of 1')).toBeInTheDocument();
  });
});

describe('Dashboard - loading, error and empty states', () => {
  const renderPage = (role: Parameters<typeof user>[0] = 'EMPLOYEE') =>
    renderWithAuth(<DashboardPage />, { as: user(role) });

  it('shows a loading indicator while the dashboard data is being fetched', () => {
    mockedStats.mockReturnValue(never());
    mockedList.mockReturnValue(never());
    mockedPending.mockResolvedValue([]);
    renderPage();

    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  it('shows the error message when the dashboard cannot load', async () => {
    mockedStats.mockRejectedValue(new Error('Unable to load the dashboard'));
    mockedList.mockResolvedValue([]);
    mockedPending.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('Unable to load the dashboard')).toBeInTheDocument();
  });

  it('greets the user and shows an empty request list for a new account', async () => {
    mockedStats.mockResolvedValue({ total: 0, draft: 0, pending: 0, approved: 0, rejected: 0 });
    mockedList.mockResolvedValue([]);
    mockedPending.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByRole('heading', { name: /welcome back, aarav/i })).toBeInTheDocument();
    expect(screen.getByText(/no requests yet|no requests/i)).toBeInTheDocument();
  });

  it('does not fetch an approval queue for a non-approver', async () => {
    mockedStats.mockResolvedValue(stats);
    mockedList.mockResolvedValue([requestSummary()]);
    mockedPending.mockResolvedValue([]);
    renderPage('EMPLOYEE');

    await screen.findByRole('heading', { name: /welcome back/i });
    expect(mockedPending).not.toHaveBeenCalled();
  });

  it('flags an approver that decisions are waiting on them', async () => {
    mockedStats.mockResolvedValue(stats);
    mockedList.mockResolvedValue([]);
    mockedPending.mockResolvedValue([pendingApproval()]);
    renderPage('MANAGER');

    await screen.findByRole('heading', { name: /welcome back/i });
    expect(mockedPending).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /1 request waiting on you/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /review queue/i })).toHaveAttribute('href', '/approvals');
  });

  it('does not flag an approver whose queue is empty', async () => {
    mockedStats.mockResolvedValue(stats);
    mockedList.mockResolvedValue([]);
    mockedPending.mockResolvedValue([]);
    renderPage('MANAGER');

    await screen.findByRole('heading', { name: /welcome back/i });
    expect(screen.queryByText(/waiting on you/i)).not.toBeInTheDocument();
  });
});
