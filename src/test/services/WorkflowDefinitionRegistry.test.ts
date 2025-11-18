import { describe, expect, it } from 'vitest';
import { WorkflowDefinitionRegistry } from '../../services/WorkflowDefinitionRegistry';
import { migrateWorkflowDefinitions } from '../../utils/workflowMigrations';
import { createBoltClientMock } from '../utils/mockSupabaseClient';
import { WorkflowDAG } from '../../types/workflow';

const retryConfig = {
  max_attempts: 1,
  initial_delay_ms: 100,
  max_delay_ms: 1000,
  multiplier: 2,
  jitter: false
};

function buildDag(version: number, makeIncompatible = false): WorkflowDAG {
  const stages = [
    {
      id: 'start',
      name: 'Start',
      agent_type: 'opportunity',
      timeout_seconds: 30,
      retry_config: retryConfig
    },
    {
      id: 'finish',
      name: 'Finish',
      agent_type: 'target',
      timeout_seconds: 30,
      retry_config: retryConfig
    }
  ];

  const transitions = [
    {
      from_stage: 'start',
      to_stage: makeIncompatible ? 'missing' : 'finish'
    }
  ];

  return {
    id: `test-workflow-${version}`,
    name: 'Test Workflow',
    description: 'Example DAG for version testing',
    version,
    stages: makeIncompatible ? stages.slice(0, 1) : stages,
    transitions,
    initial_stage: 'start',
    final_stages: ['finish'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

describe('WorkflowDefinitionRegistry', () => {
  it('stores version metadata and resolves specific versions', async () => {
    const supabase = createBoltClientMock({ workflow_definitions: [] });
    const registry = new WorkflowDefinitionRegistry(supabase);

    await registry.upsertDefinition(buildDag(1));
    await registry.upsertDefinition(buildDag(2));

    const v1 = await registry.resolve('Test Workflow', 1);
    expect(v1.version).toBe(1);
    expect(v1.dag_schema.version).toBe(1);
    expect(v1.resolved_from_fallback).toBe(false);

    const latest = await registry.resolve('Test Workflow');
    expect(latest.version).toBe(2);
    expect(latest.dag_schema.version).toBe(2);
  });

  it('falls back to the latest compatible version when a requested version is incompatible', async () => {
    const supabase = createBoltClientMock({ workflow_definitions: [] });
    const registry = new WorkflowDefinitionRegistry(supabase);

    await registry.upsertDefinition(buildDag(1));
    await registry.upsertDefinition(buildDag(2));
    await registry.upsertDefinition(buildDag(3, true));

    const resolution = await registry.resolve('Test Workflow', 3);
    expect(resolution.version).toBe(2);
    expect(resolution.resolved_from_fallback).toBe(true);
    expect(resolution.compatibility_warnings).toEqual([]);
  });
});

describe('Workflow migration utilities', () => {
  it('reports compatibility issues across multiple versions and enables fallback resolution', async () => {
    const supabase = createBoltClientMock({ workflow_definitions: [] });
    const registry = new WorkflowDefinitionRegistry(supabase);

    const migrationResults = await migrateWorkflowDefinitions(registry, [
      buildDag(1),
      buildDag(2),
      buildDag(3, true)
    ]);

    expect(migrationResults).toHaveLength(3);
    expect(migrationResults[2].compatible).toBe(false);
    expect(
      migrationResults[2].issues.some(issue => issue.includes('Transition from start to missing'))
    ).toBe(true);

    const resolution = await registry.resolve('Test Workflow', 3);
    expect(resolution.version).toBe(2);
    expect(resolution.resolved_from_fallback).toBe(true);
  });
});
