import type {
  AuthUser,
  PendingApproval,
  RequestDetail,
  RequestSummary,
  RoleName,
  SimulationResult,
  StepStatus,
  WorkflowStep,
} from '@/types';

export const user = (role: RoleName = 'EMPLOYEE', overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: role === 'EMPLOYEE' ? 1 : 2,
  name: role === 'EMPLOYEE' ? 'Aarav Sharma' : 'Priya Nair',
  email: `${role.toLowerCase()}@company.com`,
  role,
  department: 'Engineering',
  departmentId: 1,
  status: 'ACTIVE',
  ...overrides,
});

export const step = (
  approverRole: RoleName,
  status: StepStatus,
  overrides: Partial<WorkflowStep> = {}
): WorkflowStep => ({
  id: overrides.id ?? Math.floor(Math.random() * 100_000),
  stepOrder: overrides.stepOrder ?? 1,
  name: `${approverRole[0]}${approverRole.slice(1).toLowerCase()} Approval`,
  approverRole,
  approvalMode: 'SEQUENTIAL',
  required: true,
  status,
  startedAt: '2026-09-01T09:00:00.000Z',
  completedAt: status === 'APPROVED' || status === 'REJECTED' ? '2026-09-01T10:00:00.000Z' : null,
  approver: null,
  actions: [],
  ...overrides,
});

/** The high-risk laptop chain, named exactly as the seeded blueprint names it. */
const HIGH_RISK_CHAIN: Array<[RoleName, string]> = [
  ['MANAGER', 'Manager Approval'],
  ['FINANCE', 'Finance Review'],
  ['COMPLIANCE', 'Compliance Review'],
  ['DIRECTOR', 'Director Sign-off'],
];

export const highRiskSteps = (statuses: StepStatus[]): WorkflowStep[] =>
  HIGH_RISK_CHAIN.map(([role, name], index) =>
    step(role, statuses[index], { id: index + 1, stepOrder: index + 1, name })
  );

export const requestSummary = (overrides: Partial<RequestSummary> = {}): RequestSummary => ({
  id: 1,
  requestNumber: 'REQ-1001',
  type: 'LAPTOP',
  title: 'MacBook Pro M3 Max for ML workloads',
  description: 'High specification machine from a new vendor.',
  amount: 200_000,
  status: 'IN_REVIEW',
  createdAt: '2026-09-01T09:00:00.000Z',
  updatedAt: '2026-09-01T09:00:00.000Z',
  requester: {
    id: 1,
    name: 'Aarav Sharma',
    email: 'employee@company.com',
    role: 'EMPLOYEE',
    department: 'Engineering',
  },
  risk: {
    id: 1,
    score: 65,
    level: 'HIGH',
    evaluatedAt: '2026-09-01T09:00:00.000Z',
    engineVersion: '1.0.0',
    factors: [
      { factor: 'HIGH_AMOUNT', description: 'Request amount exceeds ₹1,00,000', score: 30 },
      { factor: 'NEW_VENDOR', description: 'Vendor has no prior purchase history', score: 25 },
      { factor: 'URGENT', description: 'Marked as high urgency', score: 10 },
    ],
  },
  currentStage: 'Manager Approval',
  ...overrides,
});

export const requestDetail = (overrides: Partial<RequestDetail> = {}): RequestDetail => ({
  ...requestSummary(),
  metadata: {
    specification: 'MacBook Pro 16" M3 Max',
    purpose: 'Machine learning research',
    urgency: 'HIGH',
    newVendor: true,
  },
  workflow: {
    id: 1,
    status: 'IN_PROGRESS',
    currentStep: 1,
    startedAt: '2026-09-01T09:00:00.000Z',
    completedAt: null,
    definition: {
      id: 2,
      name: 'Laptop - High Risk Approval',
      description: 'High risk equipment chain.',
      version: 1,
    },
    steps: highRiskSteps(['PENDING', 'WAITING', 'WAITING', 'WAITING']),
  },
  ...overrides,
});

export const pendingApproval = (overrides: Partial<PendingApproval> = {}): PendingApproval => ({
  stepId: 1,
  stepName: 'Manager Approval',
  stepOrder: 1,
  approverRole: 'MANAGER',
  approvalMode: 'SEQUENTIAL',
  startedAt: '2026-09-01T09:00:00.000Z',
  workflowInstanceId: 1,
  workflowName: 'Laptop - High Risk Approval',
  request: requestSummary(),
  ...overrides,
});

export const simulation = (overrides: Partial<SimulationResult> = {}): SimulationResult => ({
  risk: {
    score: 65,
    level: 'HIGH',
    engineVersion: '1.0.0',
    factors: [
      { factor: 'HIGH_AMOUNT', description: 'Request amount exceeds ₹1,00,000', score: 30 },
      { factor: 'INTERNATIONAL', description: 'International transaction', score: 20 },
      { factor: 'URGENT', description: 'Marked as high urgency', score: 10 },
    ],
  },
  workflow: {
    name: 'Laptop - High Risk Approval',
    description: 'High risk equipment chain.',
    version: 1,
    steps: [
      { stepOrder: 1, name: 'Manager Approval', approverRole: 'MANAGER', approvalMode: 'SEQUENTIAL', required: true },
      { stepOrder: 2, name: 'Finance Review', approverRole: 'FINANCE', approvalMode: 'SEQUENTIAL', required: true },
      { stepOrder: 3, name: 'Compliance Review', approverRole: 'COMPLIANCE', approvalMode: 'SEQUENTIAL', required: true },
      { stepOrder: 4, name: 'Director Sign-off', approverRole: 'DIRECTOR', approvalMode: 'SEQUENTIAL', required: true },
    ],
    path: ['MANAGER', 'FINANCE', 'COMPLIANCE', 'DIRECTOR'],
  },
  ...overrides,
});

/** A LOW-risk simulation: routine laptop, Manager then IT. */
export const lowRiskSimulation = (): SimulationResult =>
  simulation({
    risk: { score: 0, level: 'LOW', engineVersion: '1.0.0', factors: [] },
    workflow: {
      name: 'Laptop - Standard Approval',
      description: 'Manager sign-off, then IT provisioning.',
      version: 1,
      steps: [
        { stepOrder: 1, name: 'Manager Approval', approverRole: 'MANAGER', approvalMode: 'SEQUENTIAL', required: true },
        { stepOrder: 2, name: 'IT Verification', approverRole: 'IT', approvalMode: 'SEQUENTIAL', required: true },
      ],
      path: ['MANAGER', 'IT'],
    },
  });

/** A MEDIUM-risk simulation: travel that adds a Finance budget check. */
export const mediumRiskSimulation = (): SimulationResult =>
  simulation({
    risk: {
      score: 45,
      level: 'MEDIUM',
      engineVersion: '1.0.0',
      factors: [
        { factor: 'ELEVATED_AMOUNT', description: 'Request amount exceeds ₹50,000', score: 15 },
        { factor: 'NEW_VENDOR', description: 'Vendor has no prior purchase history', score: 25 },
      ],
    },
    workflow: {
      name: 'Travel - Finance Review',
      description: 'Medium risk travel adds a Finance budget check.',
      version: 1,
      steps: [
        { stepOrder: 1, name: 'Manager Approval', approverRole: 'MANAGER', approvalMode: 'SEQUENTIAL', required: true },
        { stepOrder: 2, name: 'Finance Review', approverRole: 'FINANCE', approvalMode: 'SEQUENTIAL', required: true },
      ],
      path: ['MANAGER', 'FINANCE'],
    },
  });
