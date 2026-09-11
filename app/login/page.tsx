'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Label, TextInput } from '@/components/ui/Field';
import { ApiClientError } from '@/lib/api';

const DEMO_ACCOUNTS = [
  { email: 'employee@company.com', role: 'Employee', detail: 'Raises requests' },
  { email: 'manager@company.com', role: 'Manager', detail: 'First approval stage' },
  { email: 'finance@company.com', role: 'Finance', detail: 'Budget review' },
  { email: 'compliance@company.com', role: 'Compliance', detail: 'Risk review' },
  { email: 'director@company.com', role: 'Director', detail: 'Final sign-off' },
  { email: 'it@company.com', role: 'IT', detail: 'Equipment provisioning' },
  { email: 'admin@company.com', role: 'Admin', detail: 'Full visibility' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('employee@company.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace('/dashboard');
  }, [user, authLoading, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <section className="hidden flex-col justify-between bg-slate-900 p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            A
          </span>
          <span className="text-base font-semibold text-white">ApproveFlow</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight text-white">
            Every request, routed by the risk it actually carries.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            The risk engine scores each submission on amount, geography, vendor history and
            urgency. The workflow engine then picks the approval chain that matches &mdash; a
            &#8377;30,000 laptop clears with Manager and IT, while a &#8377;1,50,000 request from a
            new vendor escalates through Finance, Compliance and the Director.
          </p>

          <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-slate-800 pt-6">
            {[
              ['Explainable', 'Every score traces to factors'],
              ['Dynamic', 'Workflow chosen per request'],
              ['Auditable', 'Append-only approval history'],
            ].map(([title, body]) => (
              <div key={title}>
                <dt className="text-xs font-semibold text-white">{title}</dt>
                <dd className="mt-1 text-2xs leading-relaxed text-slate-400">{body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-2xs text-slate-500">Demo environment &middot; seeded data</p>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center bg-slate-50 px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              A
            </span>
          </div>

          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Use a demo account to explore the platform.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <Label>Email</Label>
              <TextInput
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="block">
              <Label>Password</Label>
              <TextInput
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {error ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <Button type="submit" loading={loading} className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-8">
            <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-slate-500">
              Demo accounts &middot; password123
            </p>
            <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword('password123');
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-slate-50"
                >
                  <span>
                    <span className="block text-xs font-medium text-slate-800">{account.role}</span>
                    <span className="block text-2xs text-slate-400">{account.email}</span>
                  </span>
                  <span className="text-2xs text-slate-400">{account.detail}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
