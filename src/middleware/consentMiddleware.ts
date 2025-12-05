import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Registry interface for checking user consent for specific scopes/operations.
 */
export type ConsentRegistry = {
  hasConsent: (tenantId: string, scope: string) => Promise<boolean> | boolean;
};

/**
 * Default consent registry behavior configurable via CONSENT_DEFAULT_MODE environment variable:
 * - 'strict': Denies all requests by default (recommended for production)
 * - 'permissive': Allows all requests with warnings (for development/testing)
 * 
 * In production, replace this with a real consent registry that checks a database
 * or service for actual consent records.
 */
const defaultRegistry: ConsentRegistry = {
  hasConsent: async (tenantId: string, scope: string) => {
    const mode = process.env.CONSENT_DEFAULT_MODE || 'strict';
    
    if (mode === 'permissive') {
      console.warn(`[CONSENT] Using permissive default for tenant=${tenantId}, scope=${scope}. Configure a proper registry for production.`);
      return true;
    }
    
    // Strict mode - deny by default
    console.warn(`[CONSENT] Denied by default registry for tenant=${tenantId}, scope=${scope}. Set CONSENT_DEFAULT_MODE=permissive or configure a proper registry.`);
    return false;
  }
};

/**
 * Middleware that enforces consent checks for specific operation scopes.
 * 
 * @param scope - The scope/operation requiring consent (e.g., 'knowledge.upload', 'llm.chat')
 * @param registry - Registry implementation for checking consent. Defaults to environment-configurable registry.
 * @returns Express middleware that returns 403 if consent is not granted
 * 
 * @example
 * ```typescript
 * const myRegistry: ConsentRegistry = {
 *   hasConsent: async (tenantId, scope) => {
 *     // Check database or service for consent
 *     return await db.checkConsent(tenantId, scope);
 *   }
 * };
 * 
 * router.post('/upload', requireConsent('knowledge.upload', myRegistry), handler);
 * 
 * // Or use default with environment control:
 * // Set CONSENT_DEFAULT_MODE=permissive for development
 * router.post('/upload', requireConsent('knowledge.upload'), handler);
 * ```
 */
export function requireConsent(scope: string, registry: ConsentRegistry = defaultRegistry): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).tenantId || 'default';

    const consentGranted = await registry.hasConsent(tenantId, scope);
    if (!consentGranted) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Consent for scope "${scope}" is not granted for tenant ${tenantId}`
      });
    }

    return next();
  };
}
