import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProvenanceAuditRepository } from '../ProvenanceAuditRepository';
import { supabase } from '../../lib/supabase';

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('ProvenanceAuditRepository', () => {
  let repository: ProvenanceAuditRepository;
  let mockFrom: any;
  let mockInsert: any;
  let mockSelect: any;
  let mockEq: any;
  let mockOrder: any;

  beforeEach(() => {
    repository = new ProvenanceAuditRepository();

    // Setup mock chain
    mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    mockSelect = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      eq: mockEq
    });
    mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockFrom = vi.fn().mockReturnValue({ insert: mockInsert, select: mockSelect });

    (supabase.from as any) = mockFrom;
  });

  describe('create', () => {
    it('should insert a provenance audit entry', async () => {
      const entry = {
        session_id: 'session-123',
        agent_id: 'agent-456',
        artifact_type: 'value_tree',
        artifact_id: 'artifact-789',
        action: 'created',
        reasoning_trace: 'Test reasoning',
        artifact_data: { name: 'Test' },
        input_variables: { var1: 'value1' },
        output_snapshot: { result: 'success' }
      };

      const mockResult = { id: 'prov-123', ...entry, created_at: '2025-01-01T00:00:00Z' };
      mockSelect.mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockResult, error: null })
      });

      const result = await repository.create(entry);

      expect(mockFrom).toHaveBeenCalledWith('provenance_audit_log');
      expect(mockInsert).toHaveBeenCalledWith(entry);
      expect(result.data).toEqual(mockResult);
    });
  });

  describe('findByArtifact', () => {
    it('should query by artifact_id only', async () => {
      const mockData = [
        { id: 'prov-1', artifact_id: 'artifact-123', artifact_type: 'value_tree' },
        { id: 'prov-2', artifact_id: 'artifact-123', artifact_type: 'roi_model' }
      ];

      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const result = await repository.findByArtifact('artifact-123');

      expect(mockFrom).toHaveBeenCalledWith('provenance_audit_log');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('artifact_id', 'artifact-123');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should query by artifact_id and artifact_type', async () => {
      const mockData = [
        { id: 'prov-1', artifact_id: 'artifact-123', artifact_type: 'value_tree' }
      ];

      const mockEqChain = vi.fn().mockReturnValue({ order: mockOrder });
      mockEq.mockReturnValue({ eq: mockEqChain });
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const result = await repository.findByArtifact('artifact-123', 'value_tree');

      expect(mockEq).toHaveBeenCalledWith('artifact_id', 'artifact-123');
      expect(mockEqChain).toHaveBeenCalledWith('artifact_type', 'value_tree');
    });
  });

  describe('findBySession', () => {
    it('should query by session_id', async () => {
      const mockData = [
        { id: 'prov-1', session_id: 'session-123', artifact_type: 'value_tree' },
        { id: 'prov-2', session_id: 'session-123', artifact_type: 'roi_model' }
      ];

      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const result = await repository.findBySession('session-123');

      expect(mockFrom).toHaveBeenCalledWith('provenance_audit_log');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('session_id', 'session-123');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });
});
