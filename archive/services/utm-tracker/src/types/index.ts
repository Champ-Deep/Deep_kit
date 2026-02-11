export interface Campaign {
  id: number;
  name: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  base_url: string;
  final_url: string;
  created_at: Date;
  created_by: string | null;
}

export interface UTMClick {
  id: number;
  campaign_id: number;
  clicked_at: Date;
  ip_address: string;
  user_agent: string;
  referrer: string | null;
  country: string | null;
  city: string | null;
}

export interface CreateCampaignRequest {
  name: string;
  baseUrl: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  createdBy?: string;
}

export interface CampaignAnalytics {
  campaign: Campaign;
  totalClicks: number;
  clicksByDate: { date: string; count: number }[];
  clicksByCountry: { country: string; count: number }[];
  clicksByReferrer: { referrer: string; count: number }[];
  recentClicks: UTMClick[];
}

export interface CampaignTemplate {
  name: string;
  description: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    name: 'Facebook Ads',
    description: 'Facebook advertising campaign',
    utmSource: 'facebook',
    utmMedium: 'cpc',
    utmCampaign: 'your-campaign-name'
  },
  {
    name: 'Google Ads',
    description: 'Google Ads search campaign',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'your-campaign-name'
  },
  {
    name: 'Email Newsletter',
    description: 'Email newsletter campaign',
    utmSource: 'newsletter',
    utmMedium: 'email',
    utmCampaign: 'monthly-newsletter'
  },
  {
    name: 'LinkedIn Ads',
    description: 'LinkedIn sponsored content',
    utmSource: 'linkedin',
    utmMedium: 'cpc',
    utmCampaign: 'your-campaign-name'
  },
  {
    name: 'Twitter Ads',
    description: 'Twitter advertising campaign',
    utmSource: 'twitter',
    utmMedium: 'cpc',
    utmCampaign: 'your-campaign-name'
  },
  {
    name: 'Instagram Ads',
    description: 'Instagram advertising campaign',
    utmSource: 'instagram',
    utmMedium: 'cpc',
    utmCampaign: 'your-campaign-name'
  },
  {
    name: 'Organic Social',
    description: 'Organic social media post',
    utmSource: 'social',
    utmMedium: 'organic',
    utmCampaign: 'your-campaign-name'
  },
  {
    name: 'Affiliate Link',
    description: 'Affiliate marketing link',
    utmSource: 'affiliate',
    utmMedium: 'referral',
    utmCampaign: 'partner-name'
  }
];
