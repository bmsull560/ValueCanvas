import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Registry interface for checking user consent for specific scopes/operations.
 */
export type ConsentRegistry = {
  hasConsent: (tenantId: string, scope: string) => Promise<boolean> | boolean;
};

/**
 * Middleware that enforces consent checks for specific operation scopes.
 * 
 * @param scope - The scope/operation requiring consent (e.g., 'knowledge.upload', 'llm.chat')
 * @param registry - Registry implementation for checking consent. MUST be provided.
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
export function requireConsent(scope: string, registry: ConsentRegistry): RequestHandler {
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
