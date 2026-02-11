export interface ShortLink {
  id: number;
  short_code: string;
  original_url: string;
  custom_code: boolean;
  password_hash: string | null;
  expires_at: Date | null;
  created_at: Date;
  created_by: string | null;
  qr_code_id: number | null;
}

export interface LinkClick {
  id: number;
  link_id: number;
  clicked_at: Date;
  ip_address: string;
  user_agent: string;
  referrer: string | null;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
}

export interface CreateLinkRequest {
  originalUrl: string;
  customCode?: string;
  password?: string;
  expiresAt?: string;
  autoQR?: boolean;
}

export interface LinkAnalytics {
  link: ShortLink;
  totalClicks: number;
  clicksByDate: { date: string; count: number }[];
  clicksByCountry: { country: string; count: number }[];
  clicksByDevice: { device: string; count: number }[];
  clicksByBrowser: { browser: string; count: number }[];
  recentClicks: LinkClick[];
}
