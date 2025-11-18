import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../lib/supabase', async () => {
  const { createBoltClientMock } = await import('../utils/mockSupabaseClient');
  return { supabase: createBoltClientMock() };
});

import { AuditEventWriter, AuditEventQueryService, buildAuditEvent, createCorrelation } from '../../services/AuditEventWriter';

const createInsertSupabase = (recorded: any[]) => {
  const insert = vi.fn(async (rows: any[]) => {
    recorded.push(...rows);
    return { data: rows, error: null };
  });
  return {
    from: vi.fn(() => ({ insert })) as any,
    insert,
  } as any;
};

describe('AuditEventWriter', () => {
  const recorded: any[] = [];
  let supabase: any;
  let writer: AuditEventWriter;

  beforeEach(() => {
    recorded.length = 0;
    supabase = createInsertSupabase(recorded);
    writer = new AuditEventWriter(supabase, { maxBatchSize: 3, flushIntervalMs: 100000 });
  });

  afterEach(async () => {
    await writer.shutdown();
  });

  it('batches audit events and flushes asynchronously', async () => {
    const baseEvent = buildAuditEvent('stage_started', 'info', 'workflow', { test: true }, 'exec-1', 'stage-a', 1);

    await Promise.all(
      Array.from({ length: 4 }).map((_, i) => writer.record({
        ...baseEvent,
        correlation: createCorrelation('exec-1', 'stage-a', i + 1),
        payload: { index: i },
      }))
    );

    await writer.flush();

    expect(supabase.insert).toHaveBeenCalledTimes(2);
    expect(recorded).toHaveLength(4);
    expect(recorded[0].metadata.stage_id).toBe('stage-a');
    expect(recorded[0].metadata.correlation.correlationId).toContain('exec-1');
  });

  it('redacts sensitive fields before persisting', async () => {
    const event = buildAuditEvent(
      'stage_failed',
      'error',
      'workflow',
      { password: 'super-secret', token: 'abc123tokenvalue', email: 'user@example.com', safe: 'ok' },
      'exec-2',
      'stage-b',
      1
    );

    await writer.record(event);
    await writer.flush();

    const saved = recorded[0].metadata;
    expect(saved.password).toBe('s***'); // Updated: short strings are now masked
    expect(saved.token).toContain('***');
    expect(saved.email).toContain('***@');
    expect(saved.safe).toBe('ok');
  });
});

describe('AuditEventQueryService', () => {
  it('filters events by correlation identifiers', async () => {
    const rows = [
      {
        execution_id: 'exec-1',
        action: 'stage_started',
        metadata: {
          correlation: createCorrelation('exec-1', 'stage-a', 1),
          severity: 'info',
          source: 'workflow',
          stage_id: 'stage-a',
        },
      },
      {
        execution_id: 'exec-1',
        action: 'stage_failed',
        metadata: {
          correlation: createCorrelation('exec-1', 'stage-b', 2),
          severity: 'error',
          source: 'workflow',
          stage_id: 'stage-b',
        },
      },
    ];

    // Create chainable query mock that simulates database filtering
    const createChainableMock = (allRows: any[]) => {
      let filters: Record<string, any> = {};
      let limitValue = 100;
      
      const chainMock: any = {
        eq: vi.fn((field: string, value: any) => {
          filters[field] = value;
          return chainMock;
        }),
        order: vi.fn(() => chainMock),
        select: vi.fn(() => chainMock),
        limit: vi.fn((n: number) => {
          limitValue = n;
          // Apply filters and return filtered data
          let filtered = allRows.filter(row => {
            if (filters['execution_id'] && row.execution_id !== filters['execution_id']) return false;
            if (filters['action'] && row.action !== filters['action']) return false;
            if (filters['metadata->correlation->correlationId']) {
              const correlationId = row.metadata?.correlation?.correlationId;
              if (correlationId !== filters['metadata->correlation->correlationId']) return false;
            }
            if (filters['metadata->>stage_id']) {
              if (row.metadata?.stage_id !== filters['metadata->>stage_id']) return false;
            }
            if (filters['metadata->>severity']) {
              if (row.metadata?.severity !== filters['metadata->>severity']) return false;
            }
            return true;
          });
          filtered = filtered.slice(0, limitValue);
          return Promise.resolve({ data: filtered, error: null });
        }),
      };
      
      return chainMock;
    };

    const supabase = {
      from: vi.fn((tableName: string) => {
        if (tableName === 'workflow_audit_logs') {
          return createChainableMock(rows);
        }
        return createChainableMock([]);
      })
    } as any;

    const queryService = new AuditEventQueryService(supabase);
    const byTrace = await queryService.getByCorrelation({ traceId: 'exec-1' });
    const byCorrelation = await queryService.getByCorrelation({ correlationId: rows[1].metadata.correlation.correlationId });

    expect(byTrace).toHaveLength(2);
    expect(byCorrelation).toHaveLength(1);
    expect(byCorrelation[0].eventType).toBe('stage_failed');
  });
});
