import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
import { GenerateQRRequest, WiFiConfig, VCardConfig, QRFormat } from '../types';

const QR_DIR = path.join(process.env.HOME || '/root', 'DeepKit', 'QRCodes');

// Ensure directory exists
if (!fs.existsSync(QR_DIR)) {
  fs.mkdirSync(QR_DIR, { recursive: true });
}

/**
 * Format WiFi configuration as QR content
 */
export const formatWiFi = (config: WiFiConfig): string => {
  const hidden = config.hidden ? 'H:true' : '';
  return `WIFI:T:${config.encryption};S:${config.ssid};P:${config.password};${hidden};`;
};

/**
 * Format vCard configuration as QR content
 */
export const formatVCard = (config: VCardConfig): string => {
  let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';
  vcard += `FN:${config.name}\n`;
  if (config.phone) vcard += `TEL:${config.phone}\n`;
  if (config.email) vcard += `EMAIL:${config.email}\n`;
  if (config.organization) vcard += `ORG:${config.organization}\n`;
  if (config.url) vcard += `URL:${config.url}\n`;
  vcard += 'END:VCARD';
  return vcard;
};

/**
 * Generate QR code and save to filesystem
 */
export const generateQRCode = async (
  content: string,
  format: QRFormat = 'png',
  size: number = 400,
  errorCorrection: 'L' | 'M' | 'Q' | 'H' = 'M'
): Promise<{ filename: string; filepath: string }> => {
  const id = nanoid(10);
  const filename = `qr-${id}.${format}`;
  const filepath = path.join(QR_DIR, filename);

  const options = {
    errorCorrectionLevel: errorCorrection,
    type: format === 'png' ? 'image/png' : 'svg',
    width: size,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  };

  if (format === 'png') {
    await QRCode.toFile(filepath, content, options);
  } else {
    const svgString = await QRCode.toString(content, { ...options, type: 'svg' });
    fs.writeFileSync(filepath, svgString);
  }

  return { filename, filepath };
};

/**
 * Delete QR code file from filesystem
 */
export const deleteQRFile = (filepath: string): boolean => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting QR file:', error);
    return false;
  }
};
