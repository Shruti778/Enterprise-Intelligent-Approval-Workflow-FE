import { Sidebar } from '@/components/layout/Sidebar';
import type { RoleName } from '@/types';
import { renderWithAuth, screen } from '../test-utils/render';
import { user } from '../test-utils/fixtures';

const renderSidebar = (role: RoleName, pendingCount = 0) =>
  renderWithAuth(<Sidebar pendingCount={pendingCount} open onClose={() => {}} />, {
    as: user(role, { name: `${role} User` }),
  });

const linkNames = () =>
  screen.getAllByRole('link').map((link) => link.textContent?.replace(/\d+$/, '').trim());

/**
 * Every signed-in user can raise a request and explore the workflow tools;
 * the approval queue is the one role-gated destination.
 */
const SHARED_LINKS = [
  'Dashboard',
  'My Requests',
  'New Request',
  'Workflow Simulator',
  'Workflow Catalogue',
];

describe('Role-based navigation', () => {
  it('hides the approval queue from an employee', () => {
    renderSidebar('EMPLOYEE');

    expect(linkNames()).toEqual(SHARED_LINKS);
    expect(screen.queryByRole('link', { name: /approvals/i })).not.toBeInTheDocument();
  });

  it.each<RoleName>(['MANAGER', 'FINANCE', 'COMPLIANCE', 'DIRECTOR', 'IT'])(
    'shows the approval queue to %s',
    (role) => {
      renderSidebar(role);

      expect(screen.getByRole('link', { name: /approvals/i })).toHaveAttribute('href', '/approvals');
      expect(linkNames()).toEqual(expect.arrayContaining(SHARED_LINKS));
    }
  );

  it('shows the approval queue to an admin as well', () => {
    renderSidebar('ADMIN');

    expect(screen.getByRole('link', { name: /approvals/i })).toBeInTheDocument();
  });

  it('badges the approval queue with the number of decisions waiting', () => {
    renderSidebar('MANAGER', 3);

    expect(screen.getByRole('link', { name: /approvals/i })).toHaveTextContent('3');
  });

  it('leaves the approval link unbadged when nothing is waiting', () => {
    renderSidebar('MANAGER', 0);

    expect(screen.getByRole('link', { name: /approvals/i })).toHaveTextContent(/^Approvals$/);
  });

  it('identifies the signed-in user and their role', () => {
    renderSidebar('DIRECTOR');

    expect(screen.getByText('DIRECTOR User')).toBeInTheDocument();
    expect(screen.getByText(/DIRECTOR · Engineering/)).toBeInTheDocument();
  });

});
