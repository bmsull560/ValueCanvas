import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Configuration for lineage metadata requirements.
 */
export interface LineageRequirements {
  requiredTags: string[];
}

const defaultRequirements: LineageRequirements = {
  requiredTags: ['source_origin', 'data_sensitivity_level']
};

/**
 * Middleware that enforces lineage metadata tagging on incoming requests.
 * 
 * Validates that required lineage tags are present either as top-level fields
 * or nested within a `metadata` object.
 * 
 * @param requirements - Configuration specifying which tags are required.
 *                       Defaults to requiring 'source_origin' and 'data_sensitivity_level'.
 * @returns Express middleware that returns 400 if required tags are missing
 * 
 * @example
 * ```typescript
 * // Top-level tags
 * router.post('/upload', enforceLineage(), handler);
 * // Request body: { source_origin: 'api', data_sensitivity_level: 'high', ... }
 * 
 * // Or nested in metadata
 * // Request body: { metadata: { source_origin: 'api', data_sensitivity_level: 'high' }, ... }
 * 
 * // Custom requirements
 * router.post('/upload', enforceLineage({ requiredTags: ['source', 'classification'] }), handler);
 * ```
 */
export function enforceLineage(
  requirements: LineageRequirements = defaultRequirements
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body || {};
    const metadata = payload.metadata || {};
    
    // Check for tags in both top-level and nested metadata
    const missing = requirements.requiredTags.filter(tag => {
      const hasTopLevel = payload[tag] && payload[tag] !== '';
      const hasNested = metadata[tag] && metadata[tag] !== '';
      return !hasTopLevel && !hasNested;
    });

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Lineage tags required',
        message: `Missing lineage tags: ${missing.join(', ')}. Tags must be present either as top-level fields or within the 'metadata' object.`
      });
    }

    return next();
  };
}
