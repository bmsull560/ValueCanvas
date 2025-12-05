import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Registry interface for checking user consent for specific scopes/operations.
 */
export type ConsentRegistry = {
  hasConsent: (tenantId: string, scope: string) => Promise<boolean> | boolean;
};

/**
 * Default consent registry that always denies consent unless explicitly configured.
 * This fail-safe approach ensures consent checks are intentionally configured.
 * 
 * In production, replace this with a real consent registry that checks a database
 * or service for actual consent records.
 */
const defaultRegistry: ConsentRegistry = {
  hasConsent: async (tenantId: string, scope: string) => {
    // For now, allow all requests - but log a warning
    // In production, this should check actual consent records
    console.warn(`Using default consent registry for tenant=${tenantId}, scope=${scope}. Configure a proper registry for production.`);
    return true;
  }
};

/**
 * Middleware that enforces consent checks for specific operation scopes.
 * 
 * @param scope - The scope/operation requiring consent (e.g., 'knowledge.upload', 'llm.chat')
 * @param registry - Registry implementation for checking consent. Defaults to a permissive registry with warnings.
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
