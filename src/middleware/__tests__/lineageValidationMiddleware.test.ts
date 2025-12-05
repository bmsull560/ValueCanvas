import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enforceLineage, LineageRequirements } from '../lineageValidationMiddleware';
import type { Request, Response, NextFunction } from 'express';

function mockReq(body: any = {}): Request {
  return {
    headers: {},
    body,
  } as Request;
}

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('lineageValidationMiddleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('enforceLineage', () => {
    it('allows request with all required tags at top level', () => {
      const req = mockReq({
        source_origin: 'api',
        data_sensitivity_level: 'high',
        other_field: 'value'
      });
      const res = mockRes();
      const middleware = enforceLineage();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('allows request with all required tags in metadata', () => {
      const req = mockReq({
        metadata: {
          source_origin: 'api',
          data_sensitivity_level: 'high'
        },
        other_field: 'value'
      });
      const res = mockRes();
      const middleware = enforceLineage();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('allows request with tags split between top-level and metadata', () => {
      const req = mockReq({
        source_origin: 'api',
        metadata: {
          data_sensitivity_level: 'high'
        }
      });
      const res = mockRes();
      const middleware = enforceLineage();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects request missing source_origin', () => {
      const req = mockReq({
        data_sensitivity_level: 'high'
      });
      const res = mockRes();
      const middleware = enforceLineage();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Lineage tags required',
        message: expect.stringContaining('source_origin')
      });
    });

    it('rejects request missing data_sensitivity_level', () => {
      const req = mockReq({
        source_origin: 'api'
      });
      const res = mockRes();
      const middleware = enforceLineage();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Lineage tags required',
        message: expect.stringContaining('data_sensitivity_level')
      });
    });

    it('rejects request missing all required tags', () => {
      const req = mockReq({
        other_field: 'value'
      });
      const res = mockRes();
      const middleware = enforceLineage();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Lineage tags required',
        message: expect.stringContaining('source_origin')
      });
    });

    it('rejects request with empty string values', () => {
      const req = mockReq({
        source_origin: '',
        data_sensitivity_level: 'high'
      });
      const res = mockRes();
      const middleware = enforceLineage();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('works with custom requirements', () => {
      const customRequirements: LineageRequirements = {
        requiredTags: ['custom_tag_1', 'custom_tag_2']
      };

      const req = mockReq({
        custom_tag_1: 'value1',
        custom_tag_2: 'value2'
      });
      const res = mockRes();
      const middleware = enforceLineage(customRequirements);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects when custom requirements are not met', () => {
      const customRequirements: LineageRequirements = {
        requiredTags: ['custom_tag_1', 'custom_tag_2']
      };

      const req = mockReq({
        custom_tag_1: 'value1'
      });
      const res = mockRes();
      const middleware = enforceLineage(customRequirements);

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Lineage tags required',
        message: expect.stringContaining('custom_tag_2')
      });
    });

    it('handles missing request body gracefully', () => {
      const req = mockReq();
      delete (req as any).body;
      const res = mockRes();
      const middleware = enforceLineage();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('handles null values in tags', () => {
      const req = mockReq({
        source_origin: null,
        data_sensitivity_level: 'high'
      });
      const res = mockRes();
      const middleware = enforceLineage();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
