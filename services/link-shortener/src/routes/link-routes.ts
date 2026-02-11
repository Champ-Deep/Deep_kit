// @ts-nocheck
import { Router, Request, Response } from 'express';
import {
  createShortLink,
  getLinkByShortCode,
  getLinkById,
  getAllLinks,
  updateLink,
  deleteLink,
  verifyPassword,
  isLinkExpired,
  updateLinkQRCode
} from '../services/link-service';
import { trackClick, getLinkAnalytics, getGlobalStats } from '../services/analytics-service';
import { CreateLinkRequest } from '../types';

const router = Router();

/**
 * POST /api/links - Create short link
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const request = req.body as CreateLinkRequest;

    if (!request.originalUrl) {
      return res.status(400).json({ error: 'Missing required field: originalUrl' });
    }

    // Validate URL
    try {
      new URL(request.originalUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const link = await createShortLink(request);

    // Auto-generate QR code if requested
    if (request.autoQR) {
      try {
        const qrResponse = await fetch('http://qr-generator:3010/api/qr/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'url',
            content: `${process.env.BASE_URL || 'http://localhost:3011'}/s/${link.short_code}`,
            format: 'png',
            size: 400
          })
        });

        if (qrResponse.ok) {
          const qrData = await qrResponse.json() as any;
          await updateLinkQRCode(link.id, qrData.id);
          return res.json({
            ...link,
            shortUrl: `/s/${link.short_code}`,
            qrCode: qrData
          });
        }
      } catch (error) {
        console.error('QR generation failed:', error);
        // Continue without QR code
      }
    }

    return res.json({
      ...link,
      shortUrl: `/s/${link.short_code}`
    });
  } catch (error) {
    console.error('Link creation error:', error);
    return res.status(500).json({
      error: 'Failed to create short link',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/links - List all links
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const links = await getAllLinks();
    return res.json({
      links,
      total: links.length,
      timestamp: Date.now()
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch links',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/links/:id - Get link details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const link = await getLinkById(id);

    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    return res.json(link);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch link',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/links/:id/analytics - Get link analytics
 */
router.get('/:id/analytics', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const analytics = await getLinkAnalytics(id);

    if (!analytics) {
      return res.status(404).json({ error: 'Link not found' });
    }

    return res.json(analytics);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/links/:id - Update link
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updates = req.body as Partial<CreateLinkRequest>;

    const updatedLink = await updateLink(id, updates);

    if (!updatedLink) {
      return res.status(404).json({ error: 'Link not found' });
    }

    return res.json(updatedLink);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to update link',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/links/:id - Delete link
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await deleteLink(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Link not found' });
    }

    return res.json({ success: true, message: 'Link deleted' });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to delete link',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/links/:id/qr - Generate QR for existing link
 */
router.post('/:id/qr', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const link = await getLinkById(id);

    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const qrResponse = await fetch('http://qr-generator:3010/api/qr/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'url',
        content: `${process.env.BASE_URL || 'http://localhost:3011'}/s/${link.short_code}`,
        format: 'png',
        size: 400
      })
    });

    if (!qrResponse.ok) {
      throw new Error('QR generation failed');
    }

    const qrData = await qrResponse.json() as any;
    await updateLinkQRCode(link.id, qrData.id);

    return res.json(qrData);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to generate QR code',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/stats - Get global statistics
 */
router.get('/stats/global', async (req: Request, res: Response) => {
  try {
    const stats = await getGlobalStats();
    return res.json(stats);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /s/:shortCode - Redirect endpoint
 */
export const redirectRoute = async (req: Request, res: Response) => {
  try {
    const { shortCode } = req.params;
    const link = await getLinkByShortCode(shortCode);

    if (!link) {
      return res.status(404).send('Link not found');
    }

    // Check expiration
    if (isLinkExpired(link)) {
      return res.status(410).send('Link expired');
    }

    // Check password
    if (link.password_hash) {
      const password = req.query.password as string;
      if (!password || !(await verifyPassword(link, password))) {
        return res.status(401).send('Password required or incorrect');
      }
    }

    // Track click
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || null;

    await trackClick(link.id, ipAddress, userAgent, referrer);

    // Redirect
    return res.redirect(link.original_url);
  } catch (error) {
    console.error('Redirect error:', error);
    return res.status(500).send('Internal server error');
  }
};

export default router;
