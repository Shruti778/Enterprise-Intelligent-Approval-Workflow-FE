import { apiFetch, ApiClientError, TOKEN_KEY, USER_KEY } from '@/lib/api';

/** Minimal stand-in for a fetch Response, enough for apiFetch. */
const jsonResponse = (status: number, payload: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
});

const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

describe('apiFetch', () => {
  it('unwraps the data envelope the API responds with', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { id: 7 } }));

    await expect(apiFetch('/requests/7')).resolves.toEqual({ id: 7 });
  });

  it('sends the stored token as a bearer credential', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'jwt-123');
    mockFetch.mockResolvedValue(jsonResponse(200, { success: true, data: [] }));

    await apiFetch('/requests');

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer jwt-123');
  });

  it('omits the token on calls marked as unauthenticated', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'jwt-123');
    mockFetch.mockResolvedValue(jsonResponse(200, { success: true, data: {} }));

    await apiFetch('/auth/login', { method: 'POST', body: { email: 'a@b.com' }, auth: false });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/auth/login');
    expect(init.headers).not.toHaveProperty('Authorization');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com' });
  });

  it('raises the API error message on a failed response', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(400, {
        success: false,
        error: { message: 'Validation failed', details: [{ field: 'title', message: 'Too short' }] },
      })
    );

    await expect(apiFetch('/requests', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 400,
      message: 'Validation failed',
      details: [{ field: 'title', message: 'Too short' }],
    });
  });

  it('clears the dead session and sends the user to the login screen on a 401', async () => {
    const location = { pathname: '/requests', href: '/requests' };
    Object.defineProperty(window, 'location', { value: location, configurable: true });

    window.localStorage.setItem(TOKEN_KEY, 'expired');
    window.localStorage.setItem(USER_KEY, JSON.stringify({ id: 1 }));
    mockFetch.mockResolvedValue(jsonResponse(401, { error: { message: 'Invalid or expired token' } }));

    await expect(apiFetch('/requests')).rejects.toBeInstanceOf(ApiClientError);

    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem(USER_KEY)).toBeNull();
    expect(location.href).toBe('/login');
  });
});
