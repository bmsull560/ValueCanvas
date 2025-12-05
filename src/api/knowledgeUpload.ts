import { Router, Request, Response } from 'express';
import { enforceLineage } from '../middleware/lineageValidationMiddleware';
import { requireConsent } from '../middleware/consentMiddleware';
import {
  csrfProtectionMiddleware,
  securityHeadersMiddleware,
  sessionTimeoutMiddleware,
} from '../middleware/securityMiddleware';
import { rateLimiters } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

const router = Router();
router.use(securityHeadersMiddleware);

router.post(
  '/upload',
  rateLimiters.standard,
  csrfProtectionMiddleware,
  sessionTimeoutMiddleware,
  enforceLineage(),
  requireConsent('knowledge.upload'),
  async (req: Request, res: Response) => {
    const { source_origin, data_sensitivity_level, ...rest } = req.body;

    logger.info('Knowledge upload received', {
      source_origin,
      data_sensitivity_level,
      metadataKeys: Object.keys(rest)
    });

    res.status(201).json({
      success: true,
      data: {
        source_origin,
        data_sensitivity_level,
        metadata: rest
      }
    });
  }
);

export default router;
