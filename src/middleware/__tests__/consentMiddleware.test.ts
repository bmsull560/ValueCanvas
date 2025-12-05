import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireConsent, ConsentRegistry } from '../consentMiddleware';
import type { Request, Response, NextFunction } from 'express';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    body: {},
    ...overrides,
  } as Request;
}

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('consentMiddleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('requireConsent', () => {
    it('allows request when consent is granted', async () => {
      const registry: ConsentRegistry = {
        hasConsent: vi.fn().mockResolvedValue(true)
      };

      const req = mockReq({ headers: { 'x-tenant-id': 'tenant-123' } });
      const res = mockRes();
      const middleware = requireConsent('test.scope', registry);

      await middleware(req, res, next);

      expect(registry.hasConsent).toHaveBeenCalledWith('tenant-123', 'test.scope');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('denies request when consent is not granted', async () => {
      const registry: ConsentRegistry = {
        hasConsent: vi.fn().mockResolvedValue(false)
      };

      const req = mockReq({ headers: { 'x-tenant-id': 'tenant-123' } });
      const res = mockRes();
      const middleware = requireConsent('test.scope', registry);

      await middleware(req, res, next);

      expect(registry.hasConsent).toHaveBeenCalledWith('tenant-123', 'test.scope');
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Consent for scope "test.scope" is not granted for tenant tenant-123'
      });
    });

    it('uses tenant ID from request property when header is missing', async () => {
      const registry: ConsentRegistry = {
        hasConsent: vi.fn().mockResolvedValue(true)
      };

      const req = mockReq();
      (req as any).tenantId = 'tenant-from-prop';
      const res = mockRes();
      const middleware = requireConsent('test.scope', registry);

      await middleware(req, res, next);

      expect(registry.hasConsent).toHaveBeenCalledWith('tenant-from-prop', 'test.scope');
      expect(next).toHaveBeenCalled();
    });

    it('defaults to "default" tenant when no tenant ID is available', async () => {
      const registry: ConsentRegistry = {
        hasConsent: vi.fn().mockResolvedValue(true)
      };

      const req = mockReq();
      const res = mockRes();
      const middleware = requireConsent('test.scope', registry);

      await middleware(req, res, next);

      expect(registry.hasConsent).toHaveBeenCalledWith('default', 'test.scope');
      expect(next).toHaveBeenCalled();
    });

    it('uses default registry when none is provided', async () => {
      const req = mockReq({ headers: { 'x-tenant-id': 'tenant-123' } });
      const res = mockRes();
      const middleware = requireConsent('test.scope');

      // Default registry allows all with warning
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await middleware(req, res, next);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using default consent registry')
      );
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('handles synchronous registry implementation', async () => {
      const registry: ConsentRegistry = {
        hasConsent: vi.fn().mockReturnValue(true) // Synchronous return
      };

      const req = mockReq({ headers: { 'x-tenant-id': 'tenant-123' } });
      const res = mockRes();
      const middleware = requireConsent('test.scope', registry);

      await middleware(req, res, next);

      expect(registry.hasConsent).toHaveBeenCalledWith('tenant-123', 'test.scope');
      expect(next).toHaveBeenCalled();
    });
  });
});
