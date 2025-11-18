import { WorkflowDefinitionRegistry, WorkflowDefinitionResolution } from '../services/WorkflowDefinitionRegistry';
import { WorkflowDAG } from '../types/workflow';

export interface MigrationResult {
  version: number;
  compatible: boolean;
  issues: string[];
}

export async function migrateWorkflowDefinitions(
  registry: WorkflowDefinitionRegistry,
  definitions: WorkflowDAG[]
): Promise<MigrationResult[]> {
  const sorted = [...definitions].sort((a, b) => a.version - b.version);
  const results: MigrationResult[] = [];

  for (const definition of sorted) {
    const validation = registry.validateCompatibility({
      id: 'local',
      name: definition.name,
      description: definition.description,
      version: definition.version,
      dag_schema: definition,
      is_active: true
    });

    await registry.upsertDefinition(definition);
    results.push({ version: definition.version, compatible: validation.compatible, issues: validation.issues });
  }

  return results;
}

export async function resolveForExecution(
  registry: WorkflowDefinitionRegistry,
  name: string,
  requestedVersion?: number
): Promise<WorkflowDefinitionResolution> {
  return registry.resolve(name, requestedVersion);
}
