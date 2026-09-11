import userEvent from '@testing-library/user-event';
import NewRequestPage from '@/app/(app)/requests/new/page';
import { createRequest, submitRequest } from '@/services/requestService';
import { simulateWorkflow } from '@/services/workflowService';
import { routerMock } from '../test-utils/navigation';
import { renderWithAuth, screen, waitFor, within } from '../test-utils/render';
import {
  lowRiskSimulation,
  mediumRiskSimulation,
  requestDetail,
  simulation,
  user,
} from '../test-utils/fixtures';

jest.mock('@/services/requestService');
jest.mock('@/services/workflowService');

const mockedSimulate = simulateWorkflow as jest.MockedFunction<typeof simulateWorkflow>;
const mockedCreate = createRequest as jest.MockedFunction<typeof createRequest>;
const mockedSubmit = submitRequest as jest.MockedFunction<typeof submitRequest>;

const renderPage = () => renderWithAuth(<NewRequestPage />, { as: user('EMPLOYEE') });

/** Waits for the debounced risk preview to land. */
const awaitPreview = () => waitFor(() => expect(mockedSimulate).toHaveBeenCalled());

const riskPreview = () =>
  screen.getByRole('heading', { name: /risk preview/i }).closest('section') as HTMLElement;

const approvalFlow = () =>
  screen.getByRole('heading', { name: /expected approval flow/i }).closest('section') as HTMLElement;

beforeEach(() => {
  jest.useFakeTimers({ advanceTimers: true });
  mockedSimulate.mockResolvedValue(lowRiskSimulation());
  mockedCreate.mockResolvedValue(requestDetail({ id: 42 }));
  mockedSubmit.mockResolvedValue(requestDetail({ id: 42, status: 'IN_REVIEW' }));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Raise a request', () => {
  it('renders the form with the laptop type selected by default', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'New Request' })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    // Laptop-specific fields.
    expect(screen.getByLabelText(/specification/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sourced from a new vendor/i)).toBeInTheDocument();
    await awaitPreview();
  });

  it('swaps in the travel fields when the travel type is chosen', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /travel/i }));

    expect(screen.getByLabelText(/destination/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/international travel/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/specification/i)).not.toBeInTheDocument();
  });

  it('swaps in the expense fields, including the receipt flag', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /expense/i }));

    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/expense date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/receipt attached/i)).toBeInTheDocument();
  });

  it('swaps in the leave fields and drops the monetary amount', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /leave/i }));

    expect(screen.getByLabelText(/leave type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/duration \(days\)/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/amount/i)).not.toBeInTheDocument();
    expect(screen.getByText(/carry no monetary amount/i)).toBeInTheDocument();
  });

  it('refuses to save while the required fields are incomplete', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));

    expect(await screen.findByText(/please complete/i)).toHaveTextContent(/title/i);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('names each missing type-specific field in the validation message', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText(/title/i), 'New laptop for the ML team');
    await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));

    const message = await screen.findByText(/please complete/i);
    expect(message).toHaveTextContent(/Specification/);
    expect(message).toHaveTextContent(/Purpose/);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('creates and submits a complete request, then opens it', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText(/title/i), 'MacBook Pro M3 Max for ML workloads');
    await userEvent.type(screen.getByLabelText(/amount/i), '200000');
    await userEvent.type(screen.getByLabelText(/specification/i), 'MacBook Pro 16" M3 Max');
    await userEvent.type(screen.getByLabelText(/^purpose/i), 'Machine learning research');
    await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'LAPTOP',
        title: 'MacBook Pro M3 Max for ML workloads',
        amount: 200_000,
        metadata: expect.objectContaining({ specification: 'MacBook Pro 16" M3 Max' }),
      })
    );
    expect(mockedSubmit).toHaveBeenCalledWith(42);
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith('/requests/42'));
  });

  it('saves a draft without submitting it for approval', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText(/title/i), 'Spare docking station');
    await userEvent.type(screen.getByLabelText(/specification/i), 'USB-C dock');
    await userEvent.type(screen.getByLabelText(/^purpose/i), 'Desk setup');
    await userEvent.click(screen.getByRole('button', { name: /save as draft/i }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    expect(mockedSubmit).not.toHaveBeenCalled();
  });

  it('surfaces a failed submission instead of navigating away', async () => {
    mockedCreate.mockRejectedValue(new Error('Amount cannot be negative'));
    renderPage();

    await userEvent.type(screen.getByLabelText(/title/i), 'Laptop request');
    await userEvent.type(screen.getByLabelText(/specification/i), 'Dell Latitude');
    await userEvent.type(screen.getByLabelText(/^purpose/i), 'Development');
    await userEvent.click(screen.getByRole('button', { name: /submit for approval/i }));

    expect(await screen.findByText('Amount cannot be negative')).toBeInTheDocument();
    expect(routerMock.push).not.toHaveBeenCalled();
  });
});

describe('Risk preview on the request form', () => {
  it('shows a LOW risk assessment with no triggered factors', async () => {
    renderPage();
    await awaitPreview();

    expect(await within(riskPreview()).findByText('LOW')).toBeInTheDocument();
    expect(within(riskPreview()).getByText('0/100')).toBeInTheDocument();
    expect(within(riskPreview()).getByText(/no risk factors triggered/i)).toBeInTheDocument();
  });

  it('shows the approval chain the workflow engine selected', async () => {
    renderPage();
    await awaitPreview();

    const flow = approvalFlow();
    expect(await within(flow).findByText('Manager Approval')).toBeInTheDocument();
    expect(within(flow).getByText('IT Verification')).toBeInTheDocument();
  });

  it('re-scores the request when a risk-bearing attribute changes', async () => {
    renderPage();
    await awaitPreview();
    expect(await within(riskPreview()).findByText('LOW')).toBeInTheDocument();

    mockedSimulate.mockResolvedValue(simulation());
    await userEvent.type(screen.getByLabelText(/amount/i), '200000');
    await userEvent.click(screen.getByLabelText(/sourced from a new vendor/i));

    expect(await within(riskPreview()).findByText('HIGH')).toBeInTheDocument();
    expect(within(riskPreview()).getByText('65/100')).toBeInTheDocument();
    expect(mockedSimulate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'LAPTOP',
        amount: 200_000,
        metadata: expect.objectContaining({ newVendor: true }),
      })
    );
  });

  it('escalates the displayed approval chain along with the risk level', async () => {
    renderPage();
    await awaitPreview();
    expect(await within(approvalFlow()).findByText('IT Verification')).toBeInTheDocument();

    mockedSimulate.mockResolvedValue(simulation());
    await userEvent.type(screen.getByLabelText(/amount/i), '200000');

    const flow = approvalFlow();
    await waitFor(() => expect(within(flow).getByText('Director Sign-off')).toBeInTheDocument());
    expect(within(flow).getByText('Finance Review')).toBeInTheDocument();
    expect(within(flow).getByText('Compliance Review')).toBeInTheDocument();
    expect(within(flow).queryByText('IT Verification')).not.toBeInTheDocument();
  });

  it('shows a MEDIUM assessment with the factors that produced it', async () => {
    mockedSimulate.mockResolvedValue(mediumRiskSimulation());
    renderPage();
    await awaitPreview();

    const preview = riskPreview();
    expect(await within(preview).findByText('MEDIUM')).toBeInTheDocument();
    expect(within(preview).getByText('Elevated amount')).toBeInTheDocument();
    expect(within(preview).getByText('New vendor')).toBeInTheDocument();
    expect(within(preview).getByText('+25')).toBeInTheDocument();
  });
});
