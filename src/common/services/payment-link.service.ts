import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';

/**
 * Service for generating payment links and QR codes
 */
@Injectable()
export class PaymentLinkService {
  private readonly logger = new Logger(PaymentLinkService.name);

  /**
   * Generate a URL-friendly slug from a title
   * @param title - The title to slugify
   * @param suffix - Optional suffix to make it unique (e.g., timestamp)
   */
  generateSlug(title: string, suffix?: string): string {
    let slug = title
      .toLowerCase()
      .trim()
      // Remove accents
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Replace spaces and special chars with hyphens
      .replace(/[^a-z0-9]+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '');

    // Add suffix if provided
    if (suffix) {
      slug = `${slug}-${suffix}`;
    }

    // Limit to 100 characters
    return slug.substring(0, 100);
  }

  /**
   * Generate payment link URL for a fund
   * @param fundSlug - The fund's slug
   * @param appUrl - Base URL of the frontend app
   */
  generatePaymentLink(fundSlug: string, appUrl: string): string {
    // Remove trailing slash from appUrl
    const baseUrl = appUrl.replace(/\/$/, '');
    return `${baseUrl}/donate/${fundSlug}`;
  }

  /**
   * Generate QR code as base64 data URL
   * @param url - The URL to encode in the QR code
   * @returns Promise<string> - Base64 data URL of the QR code image
   */
  async generateQRCode(url: string): Promise<string> {
    try {
      // Generate QR code as data URL (base64)
      const qrCode = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'H', // High error correction
        type: 'image/png',
        margin: 2,
        width: 512, // 512x512 pixels
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      this.logger.log(`QR code generated for URL: ${url}`);
      return qrCode;
    } catch (error) {
      this.logger.error(`Failed to generate QR code: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate QR code as buffer (for file download)
   * @param url - The URL to encode in the QR code
   * @returns Promise<Buffer> - PNG image buffer
   */
  async generateQRCodeBuffer(url: string): Promise<Buffer> {
    try {
      const buffer = await QRCode.toBuffer(url, {
        errorCorrectionLevel: 'H',
        type: 'png',
        margin: 2,
        width: 1024, // Higher resolution for download
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      this.logger.log(`QR code buffer generated for URL: ${url}`);
      return buffer;
    } catch (error) {
      this.logger.error(`Failed to generate QR code buffer: ${error.message}`);
      throw error;
    }
  }
}
