export interface Contact {
  id: number;
  email: string | null;
  phone: string | null;
  name: string;
  tags: string | null;
  source: string | null;
  created_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  type: 'email' | 'whatsapp' | 'social';
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  subject: string | null;
  content: string;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface SocialPost {
  id: number;
  platform: 'meta' | 'linkedin' | 'twitter';
  content: string;
  media_url: string | null;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduled_at: string | null;
  published_at: string | null;
  external_id: string | null;
  created_at: string;
}

export interface CustomerInteraction {
  id: number;
  customer_id: number;
  channel: 'email' | 'whatsapp' | 'social' | 'form' | 'ticket';
  interaction_type: string;
  content: string | null;
  metadata: any;
  created_at: string;
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  variables: string | null;
  created_at: string;
}

export interface CreateContactRequest {
  email?: string;
  phone?: string;
  name: string;
  tags?: string;
  source?: string;
}

export interface CreateCampaignRequest {
  name: string;
  type: 'email' | 'whatsapp' | 'social';
  subject?: string;
  content: string;
  scheduled_at?: string;
}

export interface CreateSocialPostRequest {
  platform: 'meta' | 'linkedin' | 'twitter';
  content: string;
  media_url?: string;
  scheduled_at?: string;
}

export interface GenerateImageRequest {
  prompt: string;
  aspectRatio?: string;
}
