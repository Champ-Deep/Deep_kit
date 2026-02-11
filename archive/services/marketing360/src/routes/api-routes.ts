import { Router } from 'express';
import {
  getContacts,
  createContact,
  deleteContact,
  getCampaigns,
  createCampaign,
  updateCampaignStatus,
  deleteCampaign,
  getSocialPosts,
  createSocialPost,
  updateSocialPostStatus,
  deleteSocialPost,
  getCustomerInteractions,
  trackInteraction,
  getEmailTemplates,
  createEmailTemplate,
  getStats
} from '../services/database';
import { generateImage, generateSocialCaption } from '../services/gemini';

const router = Router();

// Contacts
router.get('/contacts', async (req, res) => {
  try {
    const { search } = req.query;
    const contacts = await getContacts(search as string | undefined);
    res.json(contacts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/contacts', async (req, res) => {
  try {
    const contact = await createContact(req.body);
    res.status(201).json(contact);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/contacts/:id', async (req, res) => {
  try {
    const deleted = await deleteContact(parseInt(req.params.id, 10));
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Contact not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const { type, status } = req.query;
    const campaigns = await getCampaigns(type as string | undefined, status as string | undefined);
    res.json(campaigns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/campaigns', async (req, res) => {
  try {
    const campaign = await createCampaign(req.body);
    res.status(201).json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/campaigns/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const campaign = await updateCampaignStatus(parseInt(req.params.id, 10), status);
    if (campaign) {
      res.json(campaign);
    } else {
      res.status(404).json({ error: 'Campaign not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/campaigns/:id', async (req, res) => {
  try {
    const deleted = await deleteCampaign(parseInt(req.params.id, 10));
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Campaign not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Social Posts
router.get('/social-posts', async (req, res) => {
  try {
    const { platform } = req.query;
    const posts = await getSocialPosts(platform as string | undefined);
    res.json(posts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/social-posts', async (req, res) => {
  try {
    const post = await createSocialPost(req.body);
    res.status(201).json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/social-posts/:id/status', async (req, res) => {
  try {
    const { status, external_id } = req.body;
    const post = await updateSocialPostStatus(parseInt(req.params.id, 10), status, external_id);
    if (post) {
      res.json(post);
    } else {
      res.status(404).json({ error: 'Social post not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/social-posts/:id', async (req, res) => {
  try {
    const deleted = await deleteSocialPost(parseInt(req.params.id, 10));
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Social post not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Customer Interactions (360° Tracking)
router.get('/customers/:id/interactions', async (req, res) => {
  try {
    const interactions = await getCustomerInteractions(parseInt(req.params.id, 10));
    res.json(interactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/customers/:id/interactions', async (req, res) => {
  try {
    const { channel, interaction_type, content, metadata } = req.body;
    const interaction = await trackInteraction(
      parseInt(req.params.id, 10),
      channel,
      interaction_type,
      content,
      metadata
    );
    res.status(201).json(interaction);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Email Templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await getEmailTemplates();
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const template = await createEmailTemplate(req.body);
    res.status(201).json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI Image Generation (Gemini 2.0 Flash - "Nano Banana")
router.post('/generate-image', async (req, res) => {
  try {
    const { prompt, aspectRatio } = req.body;
    const result = await generateImage(prompt, aspectRatio);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI Caption Generation
router.post('/generate-caption', async (req, res) => {
  try {
    const { topic, platform } = req.body;
    const caption = await generateSocialCaption(topic, platform);
    res.json({ caption });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
