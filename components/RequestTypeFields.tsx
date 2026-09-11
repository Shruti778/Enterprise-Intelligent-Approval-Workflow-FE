'use client';

import type { RequestType } from '@/types';
import { Label, Select, TextInput, Checkbox } from './ui/Field';

/**
 * Type-specific fields. The backend stores all of these in the generic
 * requests.metadata JSONB column, so adding a type here needs no schema change.
 */
export interface FieldSpec {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options?: string[];
  hint?: string;
  required?: boolean;
}

export const TYPE_FIELDS: Record<RequestType, FieldSpec[]> = {
  LAPTOP: [
    { key: 'specification', label: 'Specification', kind: 'text', required: true, hint: 'e.g. MacBook Pro 16" M3' },
    { key: 'purpose', label: 'Purpose', kind: 'text', required: true },
    { key: 'urgency', label: 'Urgency', kind: 'select', options: ['LOW', 'MEDIUM', 'HIGH'] },
    { key: 'newVendor', label: 'Sourced from a new vendor', kind: 'boolean' },
  ],
  TRAVEL: [
    { key: 'destination', label: 'Destination', kind: 'text', required: true },
    { key: 'international', label: 'International travel', kind: 'boolean' },
    { key: 'startDate', label: 'Start date', kind: 'date', required: true },
    { key: 'endDate', label: 'End date', kind: 'date', required: true },
    { key: 'purpose', label: 'Purpose', kind: 'text', required: true },
  ],
  EXPENSE: [
    {
      key: 'category',
      label: 'Category',
      kind: 'select',
      options: ['TRAVEL', 'MEALS', 'SOFTWARE', 'TRAINING', 'ENTERTAINMENT', 'GIFTS', 'CONSULTING', 'MISCELLANEOUS'],
      required: true,
    },
    { key: 'receiptProvided', label: 'Receipt attached', kind: 'boolean' },
    { key: 'expenseDate', label: 'Expense date', kind: 'date', required: true },
    { key: 'description', label: 'Expense description', kind: 'text' },
  ],
  LEAVE: [
    {
      key: 'leaveType',
      label: 'Leave type',
      kind: 'select',
      options: ['ANNUAL', 'SICK', 'UNPAID', 'PARENTAL', 'COMPENSATORY'],
      required: true,
    },
    { key: 'startDate', label: 'Start date', kind: 'date', required: true },
    { key: 'endDate', label: 'End date', kind: 'date', required: true },
    { key: 'durationDays', label: 'Duration (days)', kind: 'number', required: true, hint: 'Over 15 escalates to Director' },
    { key: 'reason', label: 'Reason', kind: 'text' },
  ],
};

/** LEAVE carries no monetary value, so the amount input is hidden for it. */
export const TYPE_HAS_AMOUNT: Record<RequestType, boolean> = {
  LAPTOP: true,
  TRAVEL: true,
  EXPENSE: true,
  LEAVE: false,
};

export function MetadataFields({
  type,
  values,
  onChange,
}: {
  type: RequestType;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {TYPE_FIELDS[type].map((field) => {
        if (field.kind === 'boolean') {
          return (
            <div key={field.key} className="sm:col-span-2">
              <Checkbox
                label={field.label}
                checked={Boolean(values[field.key])}
                onChange={(event) => onChange(field.key, event.target.checked)}
              />
            </div>
          );
        }

        return (
          <label key={field.key} className="block">
            <Label hint={field.hint}>
              {field.label}
              {field.required ? <span className="text-rose-500"> *</span> : null}
            </Label>

            {field.kind === 'select' ? (
              <Select
                value={values[field.key] ?? ''}
                onChange={(event) => onChange(field.key, event.target.value)}
              >
                <option value="">Select...</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            ) : (
              <TextInput
                type={field.kind === 'number' ? 'number' : field.kind === 'date' ? 'date' : 'text'}
                value={values[field.key] ?? ''}
                min={field.kind === 'number' ? 0 : undefined}
                onChange={(event) =>
                  onChange(
                    field.key,
                    field.kind === 'number'
                      ? event.target.value === ''
                        ? ''
                        : Number(event.target.value)
                      : event.target.value
                  )
                }
              />
            )}
          </label>
        );
      })}
    </div>
  );
}

export function MetadataList({ metadata }: { metadata: Record<string, any> }) {
  const entries = Object.entries(metadata ?? {});
  if (entries.length === 0) {
    return <p className="text-xs text-slate-400">No additional details.</p>;
  }

  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
          </dt>
          <dd className="mt-0.5 text-sm text-slate-800">
            {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value || '-')}
          </dd>
        </div>
      ))}
    </dl>
  );
}
