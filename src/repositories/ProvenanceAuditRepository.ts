/**
 * Repository for 'provenance_audit_log' table.
 * Handles immutable audit entries for provenance tracking.
 */
import { supabase } from '../lib/supabase';
import { ProvenanceAuditEntry } from '../types/vos';

export class ProvenanceAuditRepository {
  /**
   * Create a provenance audit log entry.
   * Note: provenance_audit_log is immutable (INSERT only, no UPDATE/DELETE).
   */
  async create(entry: Omit<ProvenanceAuditEntry, 'id' | 'created_at'>) {
    return supabase
      .from('provenance_audit_log')
      .insert(entry)
      .select()
      .single();
  }

  /**
   * Find provenance entries by artifact ID.
   */
  async findByArtifact(artifactId: string, artifactType?: string) {
    let query = supabase
      .from('provenance_audit_log')
      .select('*')
      .eq('artifact_id', artifactId);

    if (artifactType) {
      query = query.eq('artifact_type', artifactType);
    }

    return query.order('created_at', { ascending: false });
  }

  /**
   * Find provenance entries by session ID.
   */
  async findBySession(sessionId: string) {
    return supabase
      .from('provenance_audit_log')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
  }
}
