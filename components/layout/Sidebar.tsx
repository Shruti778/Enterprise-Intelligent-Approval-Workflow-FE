'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  IconDashboard,
  IconDocument,
  IconPlus,
  IconInbox,
  IconFlask,
  IconRoute,
} from '@/components/ui/Icons';

interface NavItem {
  href: string;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
  badge?: number;
  approverOnly?: boolean;
}

export function Sidebar({
  pendingCount,
  open,
  onClose,
}: {
  pendingCount: number;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { user, isApprover } = useAuth();

  const items: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: IconDashboard },
    { href: '/requests', label: 'My Requests', icon: IconDocument },
    { href: '/requests/new', label: 'New Request', icon: IconPlus },
    { href: '/approvals', label: 'Approvals', icon: IconInbox, badge: pendingCount, approverOnly: true },
    { href: '/simulator', label: 'Workflow Simulator', icon: IconFlask },
    { href: '/workflows', label: 'Workflow Catalogue', icon: IconRoute },
  ];

  const visible = items.filter((item) => !item.approverOnly || isApprover);

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800 bg-slate-900 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-800 px-5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            A
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">ApproveFlow</p>
            <p className="text-2xs text-slate-400">Enterprise Approvals</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {visible.map((item) => {
            const active =
              item.href === '/requests'
                ? pathname === '/requests'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-brand-600 font-medium text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-2xs font-semibold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <p className="text-2xs uppercase tracking-wider text-slate-500">Signed in as</p>
          <p className="mt-1 truncate text-sm font-medium text-white">{user?.name}</p>
          <p className="truncate text-xs text-slate-400">
            {user?.role} · {user?.department ?? 'No department'}
          </p>
        </div>
      </aside>
    </>
  );
}
