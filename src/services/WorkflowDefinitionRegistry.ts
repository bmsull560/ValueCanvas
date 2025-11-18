import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';
import { WorkflowDAG } from '../types/workflow';

export interface WorkflowDefinitionRecord {
  id: string;
  name: string;
  description?: string;
  version: number;
  dag_schema: WorkflowDAG;
  is_active: boolean;
}

export interface WorkflowDefinitionResolution extends WorkflowDefinitionRecord {
  resolved_from_fallback: boolean;
  compatibility_warnings: string[];
}

export class WorkflowDefinitionRegistry {
  constructor(private db: SupabaseClient<Database>) {}

  async upsertDefinition(definition: WorkflowDAG, isActive = true): Promise<void> {
    const dagSchema: WorkflowDAG = {
      ...definition
    };

    const { error } = await this.db
      .from('workflow_definitions')
      .upsert(
        {
          name: definition.name,
          description: definition.description,
          version: definition.version,
          dag_schema: dagSchema,
          is_active: isActive
        },
        { onConflict: 'name,version' }
      );

    if (error) {
      throw new Error(`Failed to persist workflow definition: ${error.message}`);
    }
  }

  async resolve(name: string, version?: number): Promise<WorkflowDefinitionResolution> {
    const definition = await this.fetchDefinition(name, version);
    if (definition) {
      const compatibility = this.validateCompatibility(definition);
      if (compatibility.compatible) {
        return {
          ...definition,
          resolved_from_fallback: false,
          compatibility_warnings: compatibility.issues
        };
      }
    }

    const fallbackDefinition = await this.fetchLatestCompatibleVersion(name);
    if (!fallbackDefinition) {
      throw new Error(`No compatible workflow definition found for ${name}`);
    }

    const compatibility = this.validateCompatibility(fallbackDefinition);
    return {
      ...fallbackDefinition,
      resolved_from_fallback: true,
      compatibility_warnings: compatibility.issues
    };
  }

  validateCompatibility(
    record: WorkflowDefinitionRecord
  ): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];
    const dag = record.dag_schema;

    if (dag.version !== record.version) {
      issues.push(
        `Version mismatch between registry (${record.version}) and DAG schema (${dag.version})`
      );
    }

    const stageIds = new Set(dag.stages.map(stage => stage.id));
    if (!stageIds.has(dag.initial_stage)) {
      issues.push(`Initial stage ${dag.initial_stage} missing from stages list`);
    }

    dag.final_stages.forEach(stageId => {
      if (!stageIds.has(stageId)) {
        issues.push(`Final stage ${stageId} missing from stages list`);
      }
    });

    dag.transitions.forEach(transition => {
      if (!stageIds.has(transition.from_stage) || !stageIds.has(transition.to_stage)) {
        issues.push(
          `Transition from ${transition.from_stage} to ${transition.to_stage} references unknown stage`
        );
      }
    });

    return {
      compatible: issues.length === 0,
      issues
    };
  }

  private async fetchDefinition(
    name: string,
    version?: number
  ): Promise<WorkflowDefinitionRecord | null> {
    let query = this.db
      .from('workflow_definitions')
      .select('*')
      .eq('name', name)
      .eq('is_active', true);

    if (version !== undefined) {
      query = query.eq('version', version);
    }

    const { data, error } = await query.order('version', { ascending: false });
    if (error) {
      throw new Error(`Failed to resolve workflow definition: ${error.message}`);
    }

    if (!data || data.length === 0) return null;
    const record = data[0] as WorkflowDefinitionRecord;
    return record;
  }

  private async fetchLatestCompatibleVersion(
    name: string
  ): Promise<WorkflowDefinitionRecord | null> {
    const { data, error } = await this.db
      .from('workflow_definitions')
      .select('*')
      .eq('name', name)
      .eq('is_active', true)
      .order('version', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch workflow definitions: ${error.message}`);
    }

    if (!data) return null;

    for (const record of data) {
      const typedRecord = record as WorkflowDefinitionRecord;
      const compatibility = this.validateCompatibility(typedRecord);
      if (compatibility.compatible) {
        return typedRecord;
      }
    }

    return null;
  }
}
