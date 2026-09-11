'use client';

import { useAuth } from '@/lib/auth';
import { initials } from '@/lib/format';
import { IconLogout } from '@/components/ui/Icons';

export function Topbar({ title, onMenu }: { title: string; onMenu: () => void }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>

      <h1 className="flex-1 truncate text-base font-semibold text-slate-900">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight text-slate-900">{user?.name}</p>
          <p className="text-2xs text-slate-500">{user?.email}</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
          {user ? initials(user.name) : '?'}
        </span>
        <button
          type="button"
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-rose-600"
        >
          <IconLogout className="h-4.5 w-4.5" />
        </button>
      </div>
    </header>
  );
}
