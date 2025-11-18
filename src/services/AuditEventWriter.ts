import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuditEvent, AuditQueryOptions, AuditSeverity, AuditSource } from '../types/audit';
import { scrubSensitiveData } from './middleware/redaction';

interface AuditEventWriterOptions {
  flushIntervalMs?: number;
  maxBatchSize?: number;
}

export class AuditEventWriter {
  private queue: AuditEvent[] = [];
  private flushing = false;
  private flushInterval: NodeJS.Timeout;
  private readonly maxBatchSize: number;

  constructor(private client: SupabaseClient, options: AuditEventWriterOptions = {}) {
    this.maxBatchSize = options.maxBatchSize || 25;
    const flushIntervalMs = options.flushIntervalMs || 2000;
    this.flushInterval = setInterval(() => this.flush().catch(() => undefined), flushIntervalMs);
  }

  async record(event: AuditEvent): Promise<void> {
    const occurredAt = event.occurredAt || new Date().toISOString();
    const sanitizedPayload = scrubSensitiveData(event.payload || {});

    this.queue.push({ ...event, occurredAt, payload: sanitizedPayload });

    if (this.queue.length >= this.maxBatchSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;
    this.flushing = true;

    const batch = this.queue.splice(0, this.maxBatchSize);

    try {
      const rows = batch.map((event) => ({
        execution_id: event.executionId,
        action: event.eventType,
        metadata: {
          ...event.payload,
          severity: event.severity,
          source: event.source,
          correlation: event.correlation,
          stage_id: event.stageId,
          occurred_at: event.occurredAt,
        }
      }));

      const { error } = await this.client.from('workflow_audit_logs').insert(rows);
      if (error) {
        console.error('Failed to persist audit events', error.message);
      }
    } finally {
      this.flushing = false;
    }

    if (this.queue.length >= this.maxBatchSize) {
      await this.flush();
    }
  }

  async shutdown(): Promise<void> {
    clearInterval(this.flushInterval);
    await this.flush();
  }
}

export function createCorrelation(executionId: string, stageId?: string | null, attempt?: number) {
  const traceId = executionId;
  const correlationId = [executionId, stageId, attempt ?? 0].filter(Boolean).join(':');
  const parentCorrelationId = stageId ? [executionId, stageId].filter(Boolean).join(':') : undefined;
  return { traceId, correlationId, parentCorrelationId };
}

export function buildAuditEvent(
  eventType: string,
  severity: AuditSeverity,
  source: AuditSource,
  payload: Record<string, any>,
  executionId?: string,
  stageId?: string | null,
  attempt?: number
): AuditEvent {
  return {
    executionId,
    stageId,
    eventType,
    severity,
    payload,
    source,
    correlation: createCorrelation(executionId || 'n/a', stageId, attempt),
  };
}

export class AuditEventQueryService {
  constructor(private client: SupabaseClient) {}

  async getByCorrelation(options: AuditQueryOptions): Promise<AuditEvent[]> {
    const { data, error } = await this.client
      .from('workflow_audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    const events = (data || []).map((row: any) => this.fromRow(row));

    return events.filter((event) => {
      if (options.traceId && event.correlation.traceId !== options.traceId) return false;
      if (options.correlationId && event.correlation.correlationId !== options.correlationId) return false;
      if (options.stageId !== undefined && event.stageId !== options.stageId) return false;
      if (options.eventType && event.eventType !== options.eventType) return false;
      if (options.severity && event.severity !== options.severity) return false;
      return true;
    }).slice(0, options.limit || 100);
  }

  private fromRow(row: any): AuditEvent {
    const metadata = row.metadata || {};
    return {
      executionId: row.execution_id,
      stageId: metadata.stage_id,
      eventType: row.action,
      severity: metadata.severity || 'info',
      payload: metadata,
      source: metadata.source || 'workflow',
      correlation: metadata.correlation || createCorrelation(row.execution_id, metadata.stage_id),
      occurredAt: metadata.occurred_at,
    };
  }
}

export const auditEventWriter = new AuditEventWriter(supabase);
export const auditEventQueryService = new AuditEventQueryService(supabase);
