import { Router, Request, Response } from 'express';
import { generateQRCode, formatWiFi, formatVCard, deleteQRFile } from '../services/qr-service';
import { insertQRCode, getAllQRCodes, getQRCodeById, incrementScanCount, deleteQRCode } from '../services/database';
import { GenerateQRRequest, WiFiConfig, VCardConfig } from '../types';
import fs from 'fs';

const router = Router();

/**
 * POST /api/qr/generate - Generate QR code
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const body = req.body as GenerateQRRequest;

    if (!body.type || !body.content) {
      return res.status(400).json({ error: 'Missing required fields: type, content' });
    }

    let qrContent = body.content;

    // Format content based on type
    if (body.type === 'wifi') {
      const wifiConfig = JSON.parse(body.content) as WiFiConfig;
      qrContent = formatWiFi(wifiConfig);
    } else if (body.type === 'vcard') {
      const vcardConfig = JSON.parse(body.content) as VCardConfig;
      qrContent = formatVCard(vcardConfig);
    } else if (body.type === 'email') {
      qrContent = `mailto:${body.content}`;
    } else if (body.type === 'phone') {
      qrContent = `tel:${body.content}`;
    } else if (body.type === 'sms') {
      qrContent = `sms:${body.content}`;
    }

    const format = body.format || 'png';
    const size = body.size || 400;
    const errorCorrection = body.errorCorrection || 'M';

    // Generate QR code
    const { filename, filepath } = await generateQRCode(qrContent, format, size, errorCorrection);

    // Save to database
    const id = insertQRCode({
      type: body.type,
      content: body.content,
      filename,
      filepath,
      format,
      size,
      error_correction: errorCorrection
    });

    return res.json({
      id,
      filename,
      filepath,
      type: body.type,
      format,
      size,
      downloadUrl: `/api/qr/${id}/download`,
      scanUrl: `/scan/${id}`
    });
  } catch (error) {
    console.error('QR generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate QR code',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/qr - List all QR codes
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const qrCodes = getAllQRCodes();
    return res.json({
      qrCodes,
      total: qrCodes.length,
      timestamp: Date.now()
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch QR codes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/qr/:id - Get QR code details
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const qrCode = getQRCodeById(id);

    if (!qrCode) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    return res.json(qrCode);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch QR code',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/qr/:id/download - Download QR code
 */
router.get('/:id/download', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const qrCode = getQRCodeById(id);

    if (!qrCode) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    if (!fs.existsSync(qrCode.filepath)) {
      return res.status(404).json({ error: 'QR code file not found' });
    }

    return res.download(qrCode.filepath, qrCode.filename);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to download QR code',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/qr/:id - Delete QR code
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const qrCode = getQRCodeById(id);

    if (!qrCode) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    // Delete file
    deleteQRFile(qrCode.filepath);

    // Delete from database
    const deleted = deleteQRCode(id);

    if (deleted) {
      return res.json({ success: true, message: 'QR code deleted' });
    } else {
      return res.status(500).json({ error: 'Failed to delete QR code' });
    }
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to delete QR code',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /scan/:id - Track scan and redirect (for future use)
 */
router.get('/scan/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const qrCode = getQRCodeById(id);

    if (!qrCode) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    // Increment scan count
    incrementScanCount(id);

    // For URLs, redirect
    if (qrCode.type === 'url') {
      return res.redirect(qrCode.content);
    }

    // For other types, return the content
    return res.json({
      type: qrCode.type,
      content: qrCode.content,
      scans: qrCode.scans + 1
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to process scan',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
