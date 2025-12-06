import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModelService } from '../ModelService';
import { LifecycleContext } from '../../types/agent';
import { TargetAgentOutput } from '../../types/vos';

// Mock all the repositories
vi.mock('../../repositories/RoiModelRepository');
vi.mock('../../repositories/KpiTargetRepository');
vi.mock('../../repositories/ValueTreeRepository');
vi.mock('../../repositories/ValueTreeNodeRepository');
vi.mock('../../repositories/ValueTreeLinkRepository');
vi.mock('../../repositories/RoiModelCalculationRepository');
vi.mock('../../repositories/ValueCommitRepository');
vi.mock('../../repositories/ProvenanceAuditRepository');

describe('ModelService', () => {
  let service: ModelService;
  let context: LifecycleContext;

  beforeEach(() => {
    context = {
      userId: 'user-123',
      organizationId: 'org-456',
      sessionId: 'session-789',
      metadata: {}
    };
    service = new ModelService(context);
  });

  it('should initialize with organization ID', () => {
    expect(service).toBeDefined();
    expect(() => new ModelService({ userId: 'user-123' })).toThrow(
      'Organization ID is required to initialize ModelService'
    );
  });

  it('should have a provenanceRepo property', () => {
    expect((service as any).provenanceRepo).toBeDefined();
  });

  describe('persistBusinessCase', () => {
    it('should call provenance logging for all artifacts', async () => {
      const mockOutput: TargetAgentOutput = {
        valueTree: {
          name: 'Test Tree',
          description: 'Test Description',
          version: 1,
          is_published: false
        },
        roiModel: {
          name: 'Test ROI',
          description: 'Test ROI Description',
          time_period_months: 12,
          total_benefit: 100000,
          total_cost: 50000,
          net_value: 50000,
          roi_percentage: 100,
          payback_period_months: 6
        },
        valueCommit: {
          name: 'Test Commit',
          description: 'Test Commit Description',
          target_date: '2025-12-31',
          committed_value: 50000,
          confidence_level: 'high',
          status: 'active'
        },
        kpiTargets: [],
        businessCase: {
          reasoning: 'Test reasoning',
          nodes: [],
          links: [],
          calculations: [],
          kpi_targets: []
        }
      } as any;

      // Mock repository responses
      const mockTreeData = { id: 'tree-123', name: 'Test Tree', version: 1 };
      const mockRoiData = {
        id: 'roi-123',
        name: 'Test ROI',
        total_benefit: 100000,
        total_cost: 50000,
        net_value: 50000,
        roi_percentage: 100
      };
      const mockCommitData = {
        id: 'commit-123',
        target_date: '2025-12-31',
        status: 'active',
        committed_value: 50000,
        confidence_level: 'high'
      };

      (service as any).valueTreeRepo.create = vi.fn().mockResolvedValue({
        data: mockTreeData,
        error: null
      });
      (service as any).roiModelRepo.create = vi.fn().mockResolvedValue({
        data: mockRoiData,
        error: null
      });
      (service as any).valueCommitRepo.create = vi.fn().mockResolvedValue({
        data: mockCommitData,
        error: null
      });
      (service as any).provenanceRepo.create = vi.fn().mockResolvedValue({
        data: { id: 'prov-123' },
        error: null
      });

      const result = await service.persistBusinessCase(mockOutput, 'case-123');

      expect(result.valueTreeId).toBe('tree-123');
      expect(result.roiModelId).toBe('roi-123');
      expect(result.valueCommitId).toBe('commit-123');

      // Verify provenance logging was called for each artifact type
      const provenanceCreateCalls = (service as any).provenanceRepo.create.mock.calls;
      
      // Should have been called for: value_tree, roi_model, value_commit
      expect(provenanceCreateCalls.length).toBeGreaterThanOrEqual(3);

      // Check value_tree provenance
      const treeProvenanceCall = provenanceCreateCalls.find(
        (call: any) => call[0].artifact_type === 'value_tree'
      );
      expect(treeProvenanceCall).toBeDefined();
      expect(treeProvenanceCall[0].artifact_id).toBe('tree-123');
      expect(treeProvenanceCall[0].action).toBe('created');
      expect(treeProvenanceCall[0].session_id).toBe('session-789');

      // Check roi_model provenance
      const roiProvenanceCall = provenanceCreateCalls.find(
        (call: any) => call[0].artifact_type === 'roi_model'
      );
      expect(roiProvenanceCall).toBeDefined();
      expect(roiProvenanceCall[0].artifact_id).toBe('roi-123');
      expect(roiProvenanceCall[0].action).toBe('created');

      // Check value_commit provenance
      const commitProvenanceCall = provenanceCreateCalls.find(
        (call: any) => call[0].artifact_type === 'value_commit'
      );
      expect(commitProvenanceCall).toBeDefined();
      expect(commitProvenanceCall[0].artifact_id).toBe('commit-123');
      expect(commitProvenanceCall[0].action).toBe('created');
    });

    it('should log provenance for calculations when they exist', async () => {
      const mockOutput: TargetAgentOutput = {
        valueTree: {
          name: 'Test Tree',
          version: 1,
          is_published: false
        },
        roiModel: {
          name: 'Test ROI',
          time_period_months: 12,
          total_benefit: 100000,
          total_cost: 50000,
          net_value: 50000,
          roi_percentage: 100,
          payback_period_months: 6
        },
        valueCommit: {
          name: 'Test Commit',
          target_date: '2025-12-31',
          committed_value: 50000,
          confidence_level: 'high',
          status: 'active'
        },
        kpiTargets: [],
        businessCase: {
          reasoning: 'Test reasoning',
          nodes: [],
          links: [],
          calculations: [
            {
              calculation_type: 'revenue',
              formula: 'A * B',
              result_value: 10000,
              input_variables: [
                { name: 'A', source: 'revenue_assumption', description: 'Annual revenue' },
                { name: 'B', source: 'multiplier', description: 'Growth multiplier' }
              ],
              reasoning_trace: 'Calculation reasoning'
            }
          ],
          kpi_targets: []
        }
      } as any;

      const mockCalcData = {
        id: 'calc-123',
        calculation_type: 'revenue',
        formula: 'A * B',
        result_value: 10000
      };

      (service as any).valueTreeRepo.create = vi.fn().mockResolvedValue({
        data: { id: 'tree-123', name: 'Test Tree', version: 1 },
        error: null
      });
      (service as any).roiModelRepo.create = vi.fn().mockResolvedValue({
        data: { id: 'roi-123', name: 'Test ROI', total_benefit: 100000, total_cost: 50000, net_value: 50000, roi_percentage: 100 },
        error: null
      });
      (service as any).roiModelCalcRepo.create = vi.fn().mockResolvedValue({
        data: mockCalcData,
        error: null
      });
      (service as any).valueCommitRepo.create = vi.fn().mockResolvedValue({
        data: { id: 'commit-123', target_date: '2025-12-31', status: 'active', committed_value: 50000, confidence_level: 'high' },
        error: null
      });
      (service as any).provenanceRepo.create = vi.fn().mockResolvedValue({
        data: { id: 'prov-123' },
        error: null
      });

      await service.persistBusinessCase(mockOutput, 'case-123');

      const provenanceCreateCalls = (service as any).provenanceRepo.create.mock.calls;

      // Check roi_calculation provenance
      const calcProvenanceCall = provenanceCreateCalls.find(
        (call: any) => call[0].artifact_type === 'roi_calculation'
      );
      expect(calcProvenanceCall).toBeDefined();
      expect(calcProvenanceCall[0].artifact_id).toBe('calc-123');
      expect(calcProvenanceCall[0].action).toBe('created');
      // Input variables should be converted from array to Record
      expect(calcProvenanceCall[0].input_variables).toEqual({
        A: 'revenue_assumption',
        B: 'multiplier'
      });
    });
  });
});
