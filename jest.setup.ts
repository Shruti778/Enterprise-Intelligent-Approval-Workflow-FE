import '@testing-library/jest-dom';
import { resetNavigation } from './test-utils/navigation';

jest.mock('next/navigation', () => require('./test-utils/navigation').navigationMock);

beforeEach(() => {
  window.localStorage.clear();
  resetNavigation();
});
