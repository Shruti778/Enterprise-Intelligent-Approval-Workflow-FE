import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from '@/lib/auth';
import { TOKEN_KEY, USER_KEY } from '@/lib/api';
import type { AuthUser } from '@/types';

/** Seeds the storage AuthProvider reads on mount, as a real login would. */
export function signIn(user: AuthUser, token = 'test-token'): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function renderWithAuth(
  ui: ReactElement,
  { as, ...options }: RenderOptions & { as?: AuthUser } = {}
) {
  if (as) signIn(as);
  return render(<AuthProvider>{ui}</AuthProvider>, options);
}

export * from '@testing-library/react';
