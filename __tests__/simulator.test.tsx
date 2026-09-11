import userEvent from '@testing-library/user-event';
import SimulatorPage from '@/app/(app)/simulator/page';
import { simulateWorkflow } from '@/services/workflowService';
import { createRequest, submitRequest } from '@/services/requestService';
import { renderWithAuth, screen, waitFor, within } from '../test-utils/render';
import { lowRiskSimulation, simulation, user } from '../test-utils/fixtures';

jest.mock('@/services/workflowService');
jest.mock('@/services/requestService');

const mockedSimulate = simulateWorkflow as jest.MockedFunction<typeof simulateWorkflow>;
const mockedCreate = createRequest as jest.MockedFunction<typeof createRequest>;
const mockedSubmit = submitRequest as jest.MockedFunction<typeof submitRequest>;

const renderPage = () => renderWithAuth(<SimulatorPage />, { as: user('EMPLOYEE') });

const riskResult = () =>
  screen.getByRole('heading', { name: /risk result/i }).closest('section') as HTMLElement;

const workflowResult = () =>
  screen.getByRole('heading', { name: /resulting workflow/i }).closest('section') as HTMLElement;

beforeEach(() => {
  jest.useFakeTimers({ advanceTimers: true });
  mockedSimulate.mockResolvedValue(lowRiskSimulation());
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Workflow simulator', () => {
  it('renders the hypothetical request form and the result panels', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Workflow Simulator' })).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'LAPTOP' })).toBeInTheDocument();
    await waitFor(() => expect(mockedSimulate).toHaveBeenCalled());
  });

  it('scores the request and names its risk level', async () => {
    renderPage();

    expect(await within(riskResult()).findByText('LOW')).toBeInTheDocument();
    expect(within(riskResult()).getByText('0/100')).toBeInTheDocument();
  });

  it('shows the approval chain the simulated request would take', async () => {
    renderPage();

    const workflow = workflowResult();
    expect(await within(workflow).findByText('Laptop - Standard Approval')).toBeInTheDocument();
    expect(within(workflow).getByText('Manager Approval')).toBeInTheDocument();
    expect(within(workflow).getByText('IT Verification')).toBeInTheDocument();
  });

  it('produces a different result when the inputs change', async () => {
    renderPage();
    expect(await within(riskResult()).findByText('LOW')).toBeInTheDocument();

    mockedSimulate.mockResolvedValue(simulation());
    await userEvent.clear(screen.getByLabelText(/amount/i));
    await userEvent.type(screen.getByLabelText(/amount/i), '200000');

    expect(await within(riskResult()).findByText('HIGH')).toBeInTheDocument();
    expect(within(workflowResult()).getByText('Director Sign-off')).toBeInTheDocument();
  });

  it('applies a preset and re-runs the simulation with its values', async () => {
    renderPage();
    await waitFor(() => expect(mockedSimulate).toHaveBeenCalled());

    mockedSimulate.mockResolvedValue(simulation());
    await userEvent.click(screen.getByRole('button', { name: /new vendor/i }));

    await waitFor(() =>
      expect(mockedSimulate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          type: 'LAPTOP',
          amount: 150_000,
          metadata: expect.objectContaining({ newVendor: true, urgency: 'HIGH' }),
        })
      )
    );
    expect(await within(riskResult()).findByText('HIGH')).toBeInTheDocument();
  });

  it('switches the captured fields when a different request type is simulated', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'LEAVE' }));

    expect(screen.getByLabelText(/duration \(days\)/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(mockedSimulate).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'LEAVE' }))
    );
  });

  it('never creates a real request while simulating', async () => {
    renderPage();
    await waitFor(() => expect(mockedSimulate).toHaveBeenCalled());

    await userEvent.clear(screen.getByLabelText(/amount/i));
    await userEvent.type(screen.getByLabelText(/amount/i), '500000');
    await waitFor(() => expect(mockedSimulate).toHaveBeenCalledTimes(2));

    expect(mockedCreate).not.toHaveBeenCalled();
    expect(mockedSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/nothing is saved/i)).toBeInTheDocument();
  });
});
