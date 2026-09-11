'use client';

import { useEffect, useState } from 'react';
import { listWorkflowDefinitions } from '@/services/workflowService';
import type { WorkflowDefinitionRecord } from '@/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner, ErrorNote } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/layout/PageHeader';
import { WorkflowPath } from '@/components/WorkflowTimeline';

const OPERATORS: Record<string, string> = {
  EQUALS: 'is',
  NOT_EQUALS: 'is not',
  IN: 'is one of',
  NOT_IN: 'is not one of',
  GT: '>',
  GTE: '>=',
  LT: '<',
  LTE: '<=',
  IS_TRUE: 'is true',
  IS_FALSE: 'is false',
};

export default function WorkflowsPage() {
  const [definitions, setDefinitions] = useState<WorkflowDefinitionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listWorkflowDefinitions()
      .then(setDefinitions)
      .catch((err) => setError(err.message ?? 'Unable to load workflow definitions'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading workflow catalogue" />;
  if (error) return <ErrorNote message={error} />;

  return (
    <>
      <PageHeader
        title="Workflow Catalogue"
        description="The reusable blueprints the workflow engine chooses between. Every rule must match for a definition to be selected; the most specific match wins."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        {definitions.map((definition) => (
          <Card key={definition.id}>
            <CardHeader
              title={definition.name}
              subtitle={definition.description ?? undefined}
              action={
                <div className="flex items-center gap-2">
                  <Badge tone={definition.status === 'ACTIVE' ? 'green' : 'slate'}>
                    {definition.status}
                  </Badge>
                  <span className="text-2xs text-slate-400">v{definition.version}</span>
                </div>
              }
            />
            <CardBody className="space-y-4">
              <div>
                <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-slate-500">
                  Approval path
                </p>
                <WorkflowPath
                  steps={definition.stepDefinitions.map((step) => ({
                    stepOrder: step.stepOrder,
                    approverRole: step.approverRole,
                    approvalMode: step.approvalMode,
                  }))}
                />
              </div>

              <div>
                <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-slate-500">
                  Selection rules
                </p>
                {definition.rules.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    No rules &mdash; catch-all fallback.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {definition.rules.map((rule) => (
                      <li
                        key={rule.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs"
                      >
                        <span className="font-mono text-slate-700">
                          {rule.conditionType}{' '}
                          <span className="font-sans text-slate-400">
                            {OPERATORS[rule.conditionOperator] ?? rule.conditionOperator}
                          </span>{' '}
                          <span className="font-semibold text-slate-900">{rule.conditionValue}</span>
                        </span>
                        <span className="shrink-0 text-2xs text-slate-400">priority {rule.priority}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
