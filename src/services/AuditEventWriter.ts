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
  const correlationId = [executionId, stageId, attempt ?? 0].filter(v => v !== null && v !== undefined).join(':');
  const parentCorrelationId = stageId ? [executionId, stageId].filter(v => v !== null && v !== undefined).join(':') : undefined;
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
    let query = this.client
      .from('workflow_audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters at the database level
    if (options.traceId) {
      query = query.eq('execution_id', options.traceId);
    }
    if (options.correlationId) {
      query = query.eq('metadata->correlation->correlationId', options.correlationId);
    }
    if (options.stageId !== undefined) {
      query = query.eq('metadata->>stage_id', options.stageId);
    }
    if (options.eventType) {
      query = query.eq('action', options.eventType);
    }
    if (options.severity) {
      query = query.eq('metadata->>severity', options.severity);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    } else {
      query = query.limit(100);
    }

    const { data, error } = await query;
    if (error) throw error;
    const events = (data || []).map((row: any) => this.fromRow(row));
    return events;
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
