export type QRType = 'url' | 'wifi' | 'vcard' | 'text' | 'email' | 'phone' | 'sms';
export type QRFormat = 'png' | 'svg';
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface QRCodeRecord {
  id: number;
  type: QRType;
  content: string;
  filename: string;
  filepath: string;
  format: QRFormat;
  size: number;
  error_correction: ErrorCorrectionLevel;
  created_at: string;
  scans: number;
}

export interface GenerateQRRequest {
  type: QRType;
  content: string;
  size?: number;
  format?: QRFormat;
  errorCorrection?: ErrorCorrectionLevel;
}

export interface WiFiConfig {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}

export interface VCardConfig {
  name: string;
  phone?: string;
  email?: string;
  organization?: string;
  url?: string;
}
