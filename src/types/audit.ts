export type AuditSeverity = 'info' | 'warn' | 'error';
export type AuditSource = 'workflow' | 'agent' | 'system';

export interface AuditCorrelation {
  traceId: string;
  correlationId: string;
  parentCorrelationId?: string;
}

export interface AuditEvent {
  executionId?: string;
  stageId?: string | null;
  eventType: string;
  severity: AuditSeverity;
  payload: Record<string, any>;
  source: AuditSource;
  correlation: AuditCorrelation;
  occurredAt?: string;
}

export interface AuditQueryOptions {
  traceId?: string;
  correlationId?: string;
  stageId?: string | null;
  eventType?: string;
  severity?: AuditSeverity;
  limit?: number;
}
