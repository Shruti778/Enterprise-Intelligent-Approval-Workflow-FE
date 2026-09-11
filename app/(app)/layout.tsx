'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { getPendingCount } from '@/services/approvalService';

const TITLES: Array<[string, string]> = [
  ['/dashboard', 'Dashboard'],
  ['/requests/new', 'New Request'],
  ['/requests', 'Requests'],
  ['/approvals', 'Approvals'],
  ['/simulator', 'Workflow Simulator'],
  ['/workflows', 'Workflow Catalogue'],
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isApprover } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  const refreshPending = useCallback(() => {
    if (!isApprover) return;
    getPendingCount()
      .then((data) => setPendingCount(data.count))
      .catch(() => setPendingCount(0));
  }, [isApprover]);

  // Re-checked on navigation so the badge reflects approvals just acted on.
  useEffect(() => {
    refreshPending();
  }, [refreshPending, pathname]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-500">
        Loading workspace...
      </div>
    );
  }

  const title = TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'Dashboard';

  return (
    <div className="min-h-screen">
      <Sidebar pendingCount={pendingCount} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-64">
        <Topbar title={title} onMenu={() => setMenuOpen(true)} />
        <main className="animate-fade-rise px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
