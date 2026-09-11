export type RequestType = 'LAPTOP' | 'TRAVEL' | 'EXPENSE' | 'LEAVE';

export type RequestStatus =
  | 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type RoleName =
  | 'EMPLOYEE' | 'MANAGER' | 'FINANCE' | 'COMPLIANCE' | 'DIRECTOR' | 'IT' | 'ADMIN';

export type StepStatus = 'WAITING' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';

export type ApprovalMode = 'SEQUENTIAL' | 'PARALLEL';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: RoleName;
  department: string | null;
  departmentId: number | null;
  status: string;
}

export interface RiskFactor {
  id?: number;
  factor: string;
  description: string;
  score: number;
}

export interface RiskAssessment {
  id: number;
  score: number;
  level: RiskLevel;
  evaluatedAt: string;
  engineVersion: string;
  factors: RiskFactor[];
}

export interface ApprovalActionRecord {
  id: number;
  action: 'APPROVED' | 'REJECTED';
  comment: string | null;
  createdAt: string;
  actor: { id: number; name: string; email: string; role: string | null } | null;
}

export interface WorkflowStep {
  id: number;
  stepOrder: number;
  name: string;
  approverRole: RoleName;
  approvalMode: ApprovalMode;
  required: boolean;
  status: StepStatus;
  startedAt: string | null;
  completedAt: string | null;
  approver: { id: number; name: string; role: string | null } | null;
  actions: ApprovalActionRecord[];
}

export interface WorkflowInstance {
  id: number;
  status: 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  currentStep: number | null;
  startedAt: string | null;
  completedAt: string | null;
  definition: { id: number; name: string; description: string | null; version: number } | null;
  steps: WorkflowStep[];
}

export interface RequestSummary {
  id: number;
  requestNumber: string;
  type: RequestType;
  title: string;
  description: string | null;
  amount: number;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  requester: { id: number; name: string; email: string; role: string | null; department: string | null } | null;
  risk: RiskAssessment | null;
  currentStage: string;
}

export interface RequestDetail extends RequestSummary {
  metadata: Record<string, any>;
  workflow: WorkflowInstance | null;
}

export interface PendingApproval {
  stepId: number;
  stepName: string;
  stepOrder: number;
  approverRole: RoleName;
  approvalMode: ApprovalMode;
  startedAt: string | null;
  workflowInstanceId: number;
  workflowName: string | null;
  request: RequestSummary | null;
}

export interface SimulationResult {
  risk: { score: number; level: RiskLevel; factors: RiskFactor[]; engineVersion: string };
  workflow: {
    name: string;
    description: string | null;
    version: number;
    steps: Array<{
      stepOrder: number;
      name: string;
      approverRole: RoleName;
      approvalMode: ApprovalMode;
      required: boolean;
    }>;
    path: RoleName[];
  };
}

export interface RequestStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface AuditEntry {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  metadata: Record<string, any>;
  createdAt: string;
  user: { id: number; name: string; email: string } | null;
}

export interface WorkflowDefinitionRecord {
  id: number;
  name: string;
  description: string | null;
  version: number;
  status: string;
  rules: Array<{
    id: number;
    priority: number;
    conditionType: string;
    conditionOperator: string;
    conditionValue: string | null;
  }>;
  stepDefinitions: Array<{
    id: number;
    stepOrder: number;
    name: string;
    approverRole: RoleName;
    approvalMode: ApprovalMode;
    required: boolean;
  }>;
}
