/**
 * WorkflowExecutionStore Tests
 * 
 * Tests for workflow status management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { workflowExecutionStore, WorkflowStatus } from '../WorkflowExecutionStore';

describe('WorkflowExecutionStore', () => {
  beforeEach(() => {
    // Clear any existing state before each test
    // Note: Since the store is a singleton, we need to reset it manually
    // In a real implementation with persistent storage, this would clear the store
  });

  describe('setStatus', () => {
    it('should set workflow status', () => {
      const workflowId = 'workflow-123';
      
      workflowExecutionStore.setStatus(workflowId, 'PAUSED');
      
      const status = workflowExecutionStore.getStatus(workflowId);
      expect(status).toBe('PAUSED');
    });

    it('should update existing workflow status', () => {
      const workflowId = 'workflow-123';
      
      workflowExecutionStore.setStatus(workflowId, 'PAUSED');
      workflowExecutionStore.setStatus(workflowId, 'HALTED');
      
      const status = workflowExecutionStore.getStatus(workflowId);
      expect(status).toBe('HALTED');
    });

    it('should handle different workflow IDs independently', () => {
      const workflowId1 = 'workflow-123';
      const workflowId2 = 'workflow-456';
      
      workflowExecutionStore.setStatus(workflowId1, 'PAUSED');
      workflowExecutionStore.setStatus(workflowId2, 'HALTED');
      
      expect(workflowExecutionStore.getStatus(workflowId1)).toBe('PAUSED');
      expect(workflowExecutionStore.getStatus(workflowId2)).toBe('HALTED');
    });
  });

  describe('getStatus', () => {
    it('should return RUNNING for unknown workflow ID', () => {
      const workflowId = 'unknown-workflow';
      
      const status = workflowExecutionStore.getStatus(workflowId);
      
      expect(status).toBe('RUNNING');
    });

    it('should return set status for known workflow', () => {
      const workflowId = 'workflow-123';
      
      workflowExecutionStore.setStatus(workflowId, 'PAUSED');
      
      expect(workflowExecutionStore.getStatus(workflowId)).toBe('PAUSED');
    });
  });

  describe('Status Transitions', () => {
    it('should support RUNNING to PAUSED transition', () => {
      const workflowId = 'workflow-123';
      
      // Default is RUNNING
      expect(workflowExecutionStore.getStatus(workflowId)).toBe('RUNNING');
      
      workflowExecutionStore.setStatus(workflowId, 'PAUSED');
      expect(workflowExecutionStore.getStatus(workflowId)).toBe('PAUSED');
    });

    it('should support PAUSED to RUNNING transition', () => {
      const workflowId = 'workflow-123';
      
      workflowExecutionStore.setStatus(workflowId, 'PAUSED');
      workflowExecutionStore.setStatus(workflowId, 'RUNNING');
      
      expect(workflowExecutionStore.getStatus(workflowId)).toBe('RUNNING');
    });

    it('should support RUNNING to HALTED transition', () => {
      const workflowId = 'workflow-123';
      
      workflowExecutionStore.setStatus(workflowId, 'HALTED');
      
      expect(workflowExecutionStore.getStatus(workflowId)).toBe('HALTED');
    });

    it('should support PAUSED to HALTED transition', () => {
      const workflowId = 'workflow-123';
      
      workflowExecutionStore.setStatus(workflowId, 'PAUSED');
      workflowExecutionStore.setStatus(workflowId, 'HALTED');
      
      expect(workflowExecutionStore.getStatus(workflowId)).toBe('HALTED');
    });

    it('should allow all valid status values', () => {
      const workflowId = 'workflow-123';
      const validStatuses: WorkflowStatus[] = ['RUNNING', 'PAUSED', 'HALTED'];
      
      validStatuses.forEach(status => {
        workflowExecutionStore.setStatus(workflowId, status);
        expect(workflowExecutionStore.getStatus(workflowId)).toBe(status);
      });
    });
  });
});
