import { Router, Request, Response } from 'express';
import {
  createCampaign,
  getCampaignById,
  getAllCampaigns,
  updateCampaign,
  deleteCampaign,
  bulkCreateCampaigns
} from '../services/campaign-service';
import { trackClick, getCampaignAnalytics, getGlobalStats, getAllCampaignClicks } from '../services/analytics-service';
import { CreateCampaignRequest, CAMPAIGN_TEMPLATES } from '../types';

const router = Router();

/**
 * POST /api/campaigns - Create campaign
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const request = req.body as CreateCampaignRequest;

    if (!request.name || !request.baseUrl) {
      return res.status(400).json({ error: 'Missing required fields: name, baseUrl' });
    }

    // Validate URL
    try {
      new URL(request.baseUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid base URL format' });
    }

    const campaign = await createCampaign(request);

    return res.json(campaign);
  } catch (error) {
    console.error('Campaign creation error:', error);
    return res.status(500).json({
      error: 'Failed to create campaign',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/campaigns/bulk - Bulk create campaigns
 */
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const requests = req.body.campaigns as CreateCampaignRequest[];

    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty campaigns array' });
    }

    const campaigns = await bulkCreateCampaigns(requests);

    return res.json({
      campaigns,
      total: campaigns.length,
      message: `Created ${campaigns.length} campaigns`
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Bulk creation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/campaigns - List all campaigns
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const campaigns = await getAllCampaigns();
    return res.json({
      campaigns,
      total: campaigns.length,
      timestamp: Date.now()
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch campaigns',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/campaigns/templates - Get campaign templates
 */
router.get('/templates', (req: Request, res: Response) => {
  return res.json({
    templates: CAMPAIGN_TEMPLATES,
    total: CAMPAIGN_TEMPLATES.length
  });
});

/**
 * GET /api/campaigns/:id - Get campaign details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const campaign = await getCampaignById(id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    return res.json(campaign);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch campaign',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/campaigns/:id/analytics - Get campaign analytics
 */
router.get('/:id/analytics', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const analytics = await getCampaignAnalytics(id);

    if (!analytics) {
      return res.status(404).json({ error: 'Campaign not found' });
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
 * GET /api/campaigns/:id/clicks - Get all clicks (for export)
 */
router.get('/:id/clicks', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const clicks = await getAllCampaignClicks(id);

    return res.json({
      clicks,
      total: clicks.length
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch clicks',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/campaigns/:id - Update campaign
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updates = req.body as Partial<CreateCampaignRequest>;

    const updatedCampaign = await updateCampaign(id, updates);

    if (!updatedCampaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    return res.json(updatedCampaign);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to update campaign',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/campaigns/:id - Delete campaign
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await deleteCampaign(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    return res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to delete campaign',
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
 * GET /track/:campaignId - Track click and redirect
 */
export const trackRoute = async (req: Request, res: Response) => {
  try {
    const campaignId = parseInt(req.params.campaignId, 10);
    const campaign = await getCampaignById(campaignId);

    if (!campaign) {
      return res.status(404).send('Campaign not found');
    }

    // Track click
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || null;

    await trackClick(campaignId, ipAddress, userAgent, referrer);

    // Redirect to final URL
    return res.redirect(campaign.final_url);
  } catch (error) {
    console.error('Track error:', error);
    return res.status(500).send('Internal server error');
  }
};

export default router;
