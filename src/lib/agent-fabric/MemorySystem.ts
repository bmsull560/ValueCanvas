import { SupabaseClient } from '@supabase/supabase-js';
import { MemoryType, AgentMemory } from './types';
import { LLMGateway } from './LLMGateway';

export class MemorySystem {
  constructor(
    private supabase: SupabaseClient,
    private llmGateway: LLMGateway
  ) {}

  async storeEpisodicMemory(
    sessionId: string,
    agentId: string,
    event: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.supabase.from('agent_memory').insert({
      session_id: sessionId,
      agent_id: agentId,
      memory_type: 'episodic',
      content: event,
      metadata,
      importance_score: 0.5
    });
  }

  async storeSemanticMemory(
    sessionId: string,
    agentId: string,
    knowledge: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const embedding = await this.llmGateway.generateEmbedding(knowledge);

    await this.supabase.from('agent_memory').insert({
      session_id: sessionId,
      agent_id: agentId,
      memory_type: 'semantic',
      content: knowledge,
      embedding: `[${embedding.join(',')}]`,
      metadata,
      importance_score: 0.7
    });
  }

  async storeWorkingMemory(
    sessionId: string,
    agentId: string,
    taskState: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.supabase.from('agent_memory').insert({
      session_id: sessionId,
      agent_id: agentId,
      memory_type: 'working',
      content: taskState,
      metadata,
      importance_score: 1.0
    });
  }

  async storeProceduralMemory(
    sessionId: string,
    agentId: string,
    pattern: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.supabase.from('agent_memory').insert({
      session_id: sessionId,
      agent_id: agentId,
      memory_type: 'procedural',
      content: pattern,
      metadata,
      importance_score: 0.8
    });
  }

  async getEpisodicMemory(sessionId: string, limit: number = 10): Promise<AgentMemory[]> {
    const { data, error } = await this.supabase
      .from('agent_memory')
      .select('*')
      .eq('session_id', sessionId)
      .eq('memory_type', 'episodic')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getWorkingMemory(sessionId: string, agentId?: string): Promise<AgentMemory[]> {
    let query = this.supabase
      .from('agent_memory')
      .select('*')
      .eq('session_id', sessionId)
      .eq('memory_type', 'working')
      .order('created_at', { ascending: false });

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async searchSemanticMemory(
    sessionId: string,
    query: string,
    limit: number = 5
  ): Promise<AgentMemory[]> {
    const queryEmbedding = await this.llmGateway.generateEmbedding(query);

    const { data, error } = await this.supabase.rpc('match_memory', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit,
      p_session_id: sessionId
    });

    if (error) {
      console.warn('Semantic search failed, falling back to text search:', error);
      const { data: fallbackData } = await this.supabase
        .from('agent_memory')
        .select('*')
        .eq('session_id', sessionId)
        .eq('memory_type', 'semantic')
        .ilike('content', `%${query}%`)
        .limit(limit);

      return fallbackData || [];
    }

    return data || [];
  }

  async updateAccessTime(memoryId: string): Promise<void> {
    await this.supabase
      .from('agent_memory')
      .update({ accessed_at: new Date().toISOString() })
      .eq('id', memoryId);
  }

  async clearWorkingMemory(sessionId: string): Promise<void> {
    await this.supabase
      .from('agent_memory')
      .delete()
      .eq('session_id', sessionId)
      .eq('memory_type', 'working');
  }
}
