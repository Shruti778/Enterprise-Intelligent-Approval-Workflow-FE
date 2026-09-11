'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listRequests } from '@/services/requestService';
import type { RequestStatus, RequestSummary, RequestType } from '@/types';
import { Card } from '@/components/ui/Card';
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table';
import { RiskBadge, StatusBadge } from '@/components/ui/Badge';
import { TypeChip } from '@/components/TypeChip';
import { Button } from '@/components/ui/Button';
import { Select, TextInput } from '@/components/ui/Field';
import { Spinner, ErrorNote } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatCurrency, formatDate } from '@/lib/format';
import { IconPlus } from '@/components/ui/Icons';

const STATUSES: RequestStatus[] = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED'];
const TYPES: RequestType[] = ['LAPTOP', 'TRAVEL', 'EXPENSE', 'LEAVE'];

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    listRequests({ mine: true })
      .then(setRequests)
      .catch((err) => setError(err.message ?? 'Unable to load requests'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      requests.filter(
        (request) =>
          (!status || request.status === status) &&
          (!type || request.type === type) &&
          (!search ||
            request.title.toLowerCase().includes(search.toLowerCase()) ||
            request.requestNumber.toLowerCase().includes(search.toLowerCase()))
      ),
    [requests, status, type, search]
  );

  return (
    <>
      <PageHeader
        title="My Requests"
        description="Every request you have raised, with its live risk score and approval stage."
        actions={
          <Link href="/requests/new">
            <Button>
              <IconPlus className="h-4 w-4" />
              New request
            </Button>
          </Link>
        }
      />

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-200 px-5 py-3">
          <TextInput
            placeholder="Search title or request number..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-xs"
          />
          <Select value={status} onChange={(event) => setStatus(event.target.value)} className="max-w-[10rem]">
            <option value="">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>{value.replace('_', ' ')}</option>
            ))}
          </Select>
          <Select value={type} onChange={(event) => setType(event.target.value)} className="max-w-[10rem]">
            <option value="">All types</option>
            {TYPES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </Select>
          <span className="ml-auto self-center text-xs text-slate-500">
            {filtered.length} of {requests.length}
          </span>
        </div>

        {loading ? (
          <Spinner label="Loading requests" />
        ) : error ? (
          <div className="p-5"><ErrorNote message={error} /></div>
        ) : (
          <Table>
            <thead className="bg-slate-50">
              <tr>
                <Th>Request ID</Th>
                <Th>Type</Th>
                <Th>Title</Th>
                <Th className="text-right">Amount</Th>
                <Th>Risk</Th>
                <Th>Status</Th>
                <Th>Current Stage</Th>
                <Th>Created</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <EmptyRow colSpan={9} message="No requests match these filters." />
              ) : (
                filtered.map((request) => (
                  <tr key={request.id} className="transition hover:bg-slate-50">
                    <Td className="font-mono text-xs font-semibold text-slate-700">{request.requestNumber}</Td>
                    <Td><TypeChip type={request.type} /></Td>
                    <Td className="max-w-[16rem] truncate font-medium text-slate-900">{request.title}</Td>
                    <Td className="text-right font-mono text-xs">{formatCurrency(request.amount)}</Td>
                    <Td><RiskBadge level={request.risk?.level} score={request.risk?.score} /></Td>
                    <Td><StatusBadge status={request.status} /></Td>
                    <Td className="text-xs text-slate-500">{request.currentStage}</Td>
                    <Td className="whitespace-nowrap text-xs text-slate-500">{formatDate(request.createdAt)}</Td>
                    <Td>
                      <Link
                        href={`/requests/${request.id}`}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        Open
                      </Link>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
