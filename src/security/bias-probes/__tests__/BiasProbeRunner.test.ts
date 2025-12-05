/**
 * BiasProbeRunner Tests
 * 
 * Tests for bias detection probe execution and variance calculation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { runBiasProbes, ProbeResult } from '../BiasProbeRunner';

// Mock the fairnessPrompts module
vi.mock('../fairnessPrompts', () => ({
  fairnessPrompts: [
    {
      id: 'test_prompt_1',
      scenario: 'Test Scenario 1',
      demographic: {
        id: 'demographic_a',
        label: 'Demographic A',
        attributes: { name: 'Test A' }
      },
      template: 'Test prompt for ${name}'
    },
    {
      id: 'test_prompt_2',
      scenario: 'Test Scenario 1',
      demographic: {
        id: 'demographic_b',
        label: 'Demographic B',
        attributes: { name: 'Test B' }
      },
      template: 'Test prompt for ${name}'
    },
    {
      id: 'test_prompt_3',
      scenario: 'Test Scenario 2',
      demographic: {
        id: 'demographic_a',
        label: 'Demographic A',
        attributes: { name: 'Test A' }
      },
      template: 'Test prompt for ${name}'
    },
    {
      id: 'test_prompt_4',
      scenario: 'Test Scenario 2',
      demographic: {
        id: 'demographic_b',
        label: 'Demographic B',
        attributes: { name: 'Test B' }
      },
      template: 'Test prompt for ${name}'
    }
  ],
  renderPrompt: (template: string, attributes: Record<string, string>) => 
    template.replace(/\$\{(.*?)\}/g, (_, key) => attributes[key] || '')
}));

describe('BiasProbeRunner', () => {
  const originalEnv = process.env;
  let fetchMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.STAGING_AGENT_URL = 'https://staging-agent.example.com/api';

    // Mock global fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('runBiasProbes', () => {
    it('should execute all probes and return summary', async () => {
      // Mock responses with no bias (all approve)
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ decision: 'approve', confidence: 0.9 })
      });

      const summary = await runBiasProbes();

      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(summary.results).toHaveLength(4);
      expect(summary.variance).toBe(0); // No variance when all approve
      expect(summary.report).toContain('Fairness Probe Report');
      expect(summary.report).toContain('Variance across demographics: 0%');
    });

    it('should calculate variance when there is bias', async () => {
      // Mock responses with bias: demographic_a approves, demographic_b denies
      fetchMock.mockImplementation((url: string, options: any) => {
        const body = JSON.parse(options.body);
        const decision = body.prompt.includes('Test A') ? 'approve' : 'deny';
        return Promise.resolve({
          ok: true,
          json: async () => ({ decision, confidence: 0.9 })
        });
      });

      const summary = await runBiasProbes();

      expect(summary.results).toHaveLength(4);
      expect(summary.variance).toBeGreaterThan(0);
      expect(summary.variance).toBeLessThanOrEqual(100);
      // With perfect split (2 approve, 2 deny in each scenario), variance should be 100%
      expect(summary.variance).toBe(100);
    });

    it('should calculate variance correctly for partial bias', async () => {
      let callCount = 0;
      // First 3 approve, last 1 denies (75% vs 50% approval rate difference = 25% variance)
      fetchMock.mockImplementation(() => {
        callCount++;
        const decision = callCount <= 3 ? 'approve' : 'deny';
        return Promise.resolve({
          ok: true,
          json: async () => ({ decision, confidence: 0.9 })
        });
      });

      const summary = await runBiasProbes();

      expect(summary.results).toHaveLength(4);
      expect(summary.variance).toBeGreaterThan(0);
      expect(summary.variance).toBeLessThan(100);
    });

    it('should handle "hire" decision as approval', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ decision: 'hire', confidence: 0.9 })
      });

      const summary = await runBiasProbes();

      expect(summary.variance).toBe(0); // All "hire" = no variance
    });

    it('should throw error when STAGING_AGENT_URL is not configured', async () => {
      delete process.env.STAGING_AGENT_URL;

      await expect(runBiasProbes()).rejects.toThrow('STAGING_AGENT_URL is not configured');
    });

    it('should throw error when probe request fails', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      await expect(runBiasProbes()).rejects.toThrow('Probe request failed (500)');
    });

    it('should throw error when response is missing decision', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ confidence: 0.9 }) // Missing decision
      });

      await expect(runBiasProbes()).rejects.toThrow('Probe response missing decision/confidence payload');
    });

    it('should throw error when response is missing confidence', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ decision: 'approve' }) // Missing confidence
      });

      await expect(runBiasProbes()).rejects.toThrow('Probe response missing decision/confidence payload');
    });

    it('should respect abort signal', async () => {
      const controller = new AbortController();
      
      fetchMock.mockImplementation(() => {
        controller.abort();
        return Promise.reject(new Error('Aborted'));
      });

      await expect(runBiasProbes(controller.signal)).rejects.toThrow('Aborted');
    });

    it('should include report hash in summary', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ decision: 'approve', confidence: 0.9 })
      });

      const summary = await runBiasProbes();

      expect(summary.report).toContain('report_hash=');
      expect(summary.report).toMatch(/report_hash=[a-f0-9]{64}/);
    });

    it('should include all probe results in report', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ decision: 'approve', confidence: 0.9 })
      });

      const summary = await runBiasProbes();

      expect(summary.report).toContain('Test Scenario 1');
      expect(summary.report).toContain('Test Scenario 2');
      expect(summary.report).toContain('demographic_a');
      expect(summary.report).toContain('demographic_b');
      expect(summary.report).toContain('decision=approve');
      expect(summary.report).toContain('confidence=0.9');
    });
  });
});
