import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/login/page';
import { apiFetch, ApiClientError, TOKEN_KEY, USER_KEY } from '@/lib/api';
import { routerMock } from '../test-utils/navigation';
import { renderWithAuth, screen, waitFor } from '../test-utils/render';
import { user } from '../test-utils/fixtures';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, apiFetch: jest.fn() };
});

const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

const emailField = () => screen.getByLabelText(/email/i) as HTMLInputElement;
const passwordField = () => screen.getByLabelText(/password/i) as HTMLInputElement;
const signInButton = () => screen.getByRole('button', { name: /^sign in$/i });

describe('Login page', () => {
  it('renders the sign-in form with email and password fields', () => {
    renderWithAuth(<LoginPage />);

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(emailField()).toHaveAttribute('type', 'email');
    expect(passwordField()).toHaveAttribute('type', 'password');
    expect(signInButton()).toBeEnabled();
  });

  it('lets the user type their own credentials', async () => {
    renderWithAuth(<LoginPage />);

    await userEvent.clear(emailField());
    await userEvent.type(emailField(), 'director@company.com');
    await userEvent.clear(passwordField());
    await userEvent.type(passwordField(), 'hunter2');

    expect(emailField()).toHaveValue('director@company.com');
    expect(passwordField()).toHaveValue('hunter2');
  });

  it('signs the user in, stores the session and sends them to the dashboard', async () => {
    const signedIn = user('EMPLOYEE');
    mockedApiFetch.mockResolvedValue({ token: 'jwt-abc', user: signedIn });

    renderWithAuth(<LoginPage />);
    await userEvent.click(signInButton());

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith('/dashboard'));
    expect(mockedApiFetch).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: { email: 'employee@company.com', password: 'password123' },
      auth: false,
    });
    expect(window.localStorage.getItem(TOKEN_KEY)).toBe('jwt-abc');
    expect(JSON.parse(window.localStorage.getItem(USER_KEY)!)).toEqual(signedIn);
  });

  it('shows the error from the API when the credentials are wrong', async () => {
    mockedApiFetch.mockRejectedValue(new ApiClientError(401, 'Invalid email or password'));

    renderWithAuth(<LoginPage />);
    await userEvent.click(signInButton());

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('disables the submit button while the login request is in flight', async () => {
    let resolveLogin: (value: unknown) => void = () => {};
    mockedApiFetch.mockImplementation(
      () => new Promise((resolve) => { resolveLogin = resolve; })
    );

    renderWithAuth(<LoginPage />);
    await userEvent.click(signInButton());

    await waitFor(() => expect(signInButton()).toBeDisabled());

    resolveLogin({ token: 'jwt-abc', user: user('EMPLOYEE') });
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith('/dashboard'));
  });

  it('fills the form from a demo account shortcut', async () => {
    renderWithAuth(<LoginPage />);

    await userEvent.click(screen.getByRole('button', { name: /compliance@company\.com/i }));

    expect(emailField()).toHaveValue('compliance@company.com');
  });

  it('redirects an already-authenticated visitor away from the login page', async () => {
    renderWithAuth(<LoginPage />, { as: user('MANAGER') });

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith('/dashboard'));
  });
});
