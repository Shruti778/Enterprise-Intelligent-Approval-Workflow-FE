/**
 * Stand-in for next/navigation, which has no implementation outside the Next
 * runtime. jest.setup.ts points the module at `navigationMock`; tests drive it
 * through `routerMock`, `setPathname` and `setParams`.
 */
export const routerMock = {
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
};

let pathname = '/dashboard';
let params: Record<string, string> = {};

export const setPathname = (next: string) => {
  pathname = next;
};

export const setParams = (next: Record<string, string>) => {
  params = next;
};

export const resetNavigation = () => {
  pathname = '/dashboard';
  params = {};
  Object.values(routerMock).forEach((fn) => fn.mockReset());
};

export const navigationMock = {
  useRouter: () => routerMock,
  usePathname: () => pathname,
  useParams: () => params,
  useSearchParams: () => new URLSearchParams(),
};
