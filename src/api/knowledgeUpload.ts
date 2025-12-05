/**
 * Knowledge Upload API Endpoint
 * 
 * Provides endpoints for uploading knowledge to the semantic memory store
 * with lineage tracking and consent enforcement.
 */

import { Router, Request, Response } from 'express';
import { enforceLineage } from '../middleware/lineageValidationMiddleware';
import { requireConsent } from '../middleware/consentMiddleware';
import {
  csrfProtectionMiddleware,
  securityHeadersMiddleware,
  sessionTimeoutMiddleware,
} from '../middleware/securityMiddleware';
import { serviceIdentityMiddleware } from '../middleware/serviceIdentityMiddleware';
import { rateLimiters } from '../middleware/rateLimiter';
import { semanticMemory } from '../services/SemanticMemory';
import { logger } from '../utils/logger';

const router = Router();
router.use(securityHeadersMiddleware);
router.use(serviceIdentityMiddleware);

/**
 * POST /api/knowledge/upload
 * 
 * Upload knowledge/content to the semantic memory store with lineage tracking.
 * Requires lineage metadata and consent for knowledge upload operations.
 */
router.post(
  '/upload',
  rateLimiters.standard,
  csrfProtectionMiddleware,
  sessionTimeoutMiddleware,
  enforceLineage(),
  requireConsent('knowledge.upload'),
  async (req: Request, res: Response) => {
    try {
      const { 
        content, 
        type = 'knowledge',
        source_origin, 
        data_sensitivity_level,
        metadata = {},
        ...rest 
      } = req.body;

      // Validate required fields
      if (!content || typeof content !== 'string') {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Content is required and must be a string'
        });
      }

      // Extract lineage from top-level or metadata
      const lineageMetadata = {
        source_origin: source_origin || metadata.source_origin,
        data_sensitivity_level: data_sensitivity_level || metadata.data_sensitivity_level,
        ...metadata,
        ...rest,
        uploaded_at: new Date().toISOString(),
        uploaded_by: (req as any).userId || 'anonymous'
      };

      logger.info('Knowledge upload received', {
        type,
        source_origin: lineageMetadata.source_origin,
        data_sensitivity_level: lineageMetadata.data_sensitivity_level,
        contentLength: content.length
      });

      // Store in semantic memory
      const memoryId = await semanticMemory.store({
        type,
        content,
        metadata: lineageMetadata
      });

      logger.info('Knowledge stored successfully', {
        memoryId,
        type,
        source_origin: lineageMetadata.source_origin
      });

      return res.status(201).json({
        success: true,
        data: {
          id: memoryId,
          type,
          source_origin: lineageMetadata.source_origin,
          data_sensitivity_level: lineageMetadata.data_sensitivity_level,
          stored_at: lineageMetadata.uploaded_at
        }
      });
    } catch (error) {
      logger.error('Knowledge upload failed', error as Error);
      return res.status(500).json({
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
);

export default router;
