import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigurationService } from '../../settings/services/configuration.service';
import { CreateBeneficiaryDto, BeneficiaryResponseDto } from '../dto';

/**
 * Service for interacting with NotchPay API
 * Handles payment initialization, verification, and webhooks
 */
@Injectable()
export class NotchPayService {
  private readonly logger = new Logger(NotchPayService.name);
  private readonly NOTCHPAY_API_URL = 'https://api.notchpay.co';

  constructor(private readonly configService: ConfigurationService) {}

  /**
   * Get NotchPay configuration from database
   */
  private async getConfig(): Promise<{
    publicKey: string;
    privateKey: string;
    webhookSecret: string;
    environment: string;
    receivingAccountId?: string;
  }> {
    const config = await this.configService.get<any>('notchpay_config');

    if (!config) {
      throw new InternalServerErrorException(
        'NotchPay configuration not found in database. Please configure it in settings.',
      );
    }

    if (!config.publicKey || !config.privateKey) {
      throw new InternalServerErrorException(
        'NotchPay API keys are not configured properly.',
      );
    }

    return config;
  }

  /**
   * Initialize a payment with NotchPay
   * @param amount - Amount in XAF
   * @param currency - Currency code (default: XAF)
   * @param description - Payment description
   * @param reference - Unique reference for this payment (donation ID)
   * @param callbackUrl - URL to redirect user after payment
   * @param email - User email (optional)
   * @param phone - User phone (optional)
   */
  async initializePayment(params: {
    amount: number;
    currency?: string;
    description: string;
    reference: string;
    callbackUrl?: string;
    email?: string;
    phone?: string;
    beneficiaryId?: string; // NotchPay beneficiary ID to receive the payment
  }): Promise<{
    authorization_url: string;
    reference: string;
    transactionId: string;
  }> {
    const config = await this.getConfig();

    try {
      const response = await fetch(`${this.NOTCHPAY_API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: config.publicKey,
          'X-Public-Key': config.publicKey,
        },
        body: JSON.stringify({
          amount: params.amount,
          currency: params.currency || 'XAF',
          description: params.description,
          reference: params.reference,
          callback: params.callbackUrl,
          email: params.email,
          phone: params.phone,
          // Use beneficiaryId if provided, otherwise fallback to config receivingAccountId
          ...(params.beneficiaryId
            ? { beneficiary: params.beneficiaryId }
            : config.receivingAccountId && {
                account_id: config.receivingAccountId,
              }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error(
          `NotchPay payment initialization failed: ${JSON.stringify(errorData)}`,
        );
        throw new BadRequestException(
          errorData.message || 'Payment initialization failed',
        );
      }

      const data = await response.json();

      return {
        authorization_url: data.authorization_url || data.payment_url,
        reference: data.reference,
        transactionId: data.transaction?.reference || data.reference,
      };
    } catch (error) {
      this.logger.error(
        `NotchPay API error: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to initialize payment with NotchPay',
      );
    }
  }

  /**
   * Verify a payment transaction
   * @param reference - Transaction reference
   */
  async verifyPayment(reference: string): Promise<{
    status: 'complete' | 'pending' | 'failed';
    amount: number;
    currency: string;
    transactionId: string;
    metadata?: any;
  }> {
    const config = await this.getConfig();

    try {
      const response = await fetch(
        `${this.NOTCHPAY_API_URL}/payments/${reference}`,
        {
          method: 'GET',
          headers: {
            Authorization: config.publicKey,
            'X-Grant': config.privateKey,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error(
          `NotchPay payment verification failed: ${JSON.stringify(errorData)}`,
        );
        throw new BadRequestException(
          errorData.message || 'Payment verification failed',
        );
      }

      const data = await response.json();
      const transaction = data.transaction || data;

      return {
        status: this.mapNotchPayStatus(transaction.status),
        amount: transaction.amount,
        currency: transaction.currency,
        transactionId: transaction.reference,
        metadata: transaction.metadata,
      };
    } catch (error) {
      this.logger.error(
        `NotchPay verification error: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to verify payment with NotchPay',
      );
    }
  }

  /**
   * Verify webhook signature from NotchPay
   * @param payload - Webhook payload
   * @param signature - Signature from headers
   */
  async verifyWebhookSignature(
    payload: string,
    signature: string,
  ): Promise<boolean> {
    const config = await this.getConfig();

    if (!config.webhookSecret) {
      this.logger.warn(
        'Webhook secret not configured, skipping signature verification',
      );
      return true; // Allow in development if not configured
    }

    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', config.webhookSecret)
      .update(payload)
      .digest('hex');

    return hash === signature;
  }

  /**
   * Map NotchPay status to our internal status
   */
  private mapNotchPayStatus(
    notchpayStatus: string,
  ): 'complete' | 'pending' | 'failed' {
    const statusMap: Record<string, 'complete' | 'pending' | 'failed'> = {
      complete: 'complete',
      completed: 'complete',
      success: 'complete',
      successful: 'complete',
      pending: 'pending',
      processing: 'pending',
      failed: 'failed',
      cancelled: 'failed',
      canceled: 'failed',
      expired: 'failed',
    };

    return (
      statusMap[notchpayStatus?.toLowerCase()] || 'pending'
    );
  }

  /**
   * Get payment details for a transaction
   * @param transactionId - NotchPay transaction ID
   */
  async getPaymentDetails(transactionId: string): Promise<any> {
    const config = await this.getConfig();

    try {
      const response = await fetch(
        `${this.NOTCHPAY_API_URL}/payments/${transactionId}`,
        {
          method: 'GET',
          headers: {
            Authorization: config.publicKey,
            'X-Grant': config.privateKey,
          },
        },
      );

      if (!response.ok) {
        throw new BadRequestException('Failed to fetch payment details');
      }

      return await response.json();
    } catch (error) {
      this.logger.error(
        `Failed to get payment details: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Create a new beneficiary (receiving account) in NotchPay
   * @param createBeneficiaryDto - Beneficiary data
   */
  async createBeneficiary(
    createBeneficiaryDto: CreateBeneficiaryDto,
  ): Promise<BeneficiaryResponseDto> {
    const config = await this.getConfig();

    try {
      const response = await fetch(`${this.NOTCHPAY_API_URL}/beneficiaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: config.publicKey,
          'X-Grant': config.privateKey,
        },
        body: JSON.stringify({
          name: createBeneficiaryDto.name,
          phone: createBeneficiaryDto.phone,
          email: createBeneficiaryDto.email,
          country: createBeneficiaryDto.country || 'CM',
          currency: 'XAF', // Required field
          type: 'mobile_money', // Required field - we only support mobile money for now
          // Map provider to NotchPay channel format
          channel: createBeneficiaryDto.provider.replace('cm.mobile.', 'cm.'), // cm.mobile.orange -> cm.orange
          account_number: createBeneficiaryDto.phone, // Account number = phone number for mobile money
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error(
          `NotchPay beneficiary creation failed: ${JSON.stringify(errorData)}`,
        );
        throw new BadRequestException(
          errorData.message || 'Failed to create beneficiary',
        );
      }

      const data = await response.json();

      this.logger.log(
        `Beneficiary created successfully: ${data.id || data.beneficiary?.id}`,
      );

      return {
        id: data.id || data.beneficiary?.id,
        name: data.name || data.beneficiary?.name,
        phone: data.phone || data.beneficiary?.phone,
        email: data.email || data.beneficiary?.email,
        provider: data.provider || data.type || data.beneficiary?.provider || data.beneficiary?.type,
        country: data.country || data.beneficiary?.country || 'CM',
        status: data.status || 'active',
        createdAt: new Date(
          data.created_at || data.beneficiary?.created_at || Date.now(),
        ),
      };
    } catch (error) {
      this.logger.error(
        `NotchPay beneficiary creation error: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to create beneficiary with NotchPay',
      );
    }
  }

  /**
   * Get all beneficiaries from NotchPay
   */
  async getBeneficiaries(): Promise<BeneficiaryResponseDto[]> {
    const config = await this.getConfig();

    try {
      const response = await fetch(`${this.NOTCHPAY_API_URL}/beneficiaries`, {
        method: 'GET',
        headers: {
          Authorization: config.publicKey,
          'X-Grant': config.privateKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error(
          `NotchPay get beneficiaries failed: ${JSON.stringify(errorData)}`,
        );
        throw new BadRequestException(
          errorData.message || 'Failed to fetch beneficiaries',
        );
      }

      const data = await response.json();

      // NotchPay returns beneficiaries in the "items" property
      const beneficiaries = data.items || data.beneficiaries || data.data || [];

      if (!Array.isArray(beneficiaries)) {
        this.logger.warn(
          `Unexpected beneficiaries response format: ${JSON.stringify(data)}`,
        );
        return [];
      }

      return beneficiaries.map((b: any) => ({
        id: b.id,
        name: b.name,
        phone: b.phone,
        email: b.email,
        provider: b.provider || b.type,
        country: b.country || 'CM',
        status: b.status || 'active',
        createdAt: new Date(b.created_at || Date.now()),
      }));
    } catch (error) {
      this.logger.error(
        `NotchPay get beneficiaries error: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to fetch beneficiaries from NotchPay',
      );
    }
  }

  /**
   * Get a single beneficiary by ID from NotchPay
   * @param beneficiaryId - NotchPay beneficiary ID
   */
  async getBeneficiary(beneficiaryId: string): Promise<BeneficiaryResponseDto> {
    const config = await this.getConfig();

    try {
      const response = await fetch(
        `${this.NOTCHPAY_API_URL}/beneficiaries/${beneficiaryId}`,
        {
          method: 'GET',
          headers: {
            Authorization: config.publicKey,
            'X-Grant': config.privateKey,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundException(
            `Beneficiary with ID "${beneficiaryId}" not found`,
          );
        }

        const errorData = await response.json().catch(() => ({}));
        this.logger.error(
          `NotchPay get beneficiary failed: ${JSON.stringify(errorData)}`,
        );
        throw new BadRequestException(
          errorData.message || 'Failed to fetch beneficiary',
        );
      }

      const data = await response.json();
      const b = data.beneficiary || data;

      return {
        id: b.id,
        name: b.name,
        phone: b.phone,
        email: b.email,
        provider: b.provider || b.type,
        country: b.country || 'CM',
        status: b.status || 'active',
        createdAt: new Date(b.created_at || Date.now()),
      };
    } catch (error) {
      this.logger.error(
        `NotchPay get beneficiary error: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to fetch beneficiary from NotchPay',
      );
    }
  }

  /**
   * Delete a beneficiary from NotchPay
   * @param beneficiaryId - NotchPay beneficiary ID
   */
  async deleteBeneficiary(beneficiaryId: string): Promise<void> {
    const config = await this.getConfig();

    try {
      const response = await fetch(
        `${this.NOTCHPAY_API_URL}/beneficiaries/${beneficiaryId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: config.publicKey,
            'X-Grant': config.privateKey,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundException(
            `Beneficiary with ID "${beneficiaryId}" not found`,
          );
        }

        const errorData = await response.json().catch(() => ({}));
        this.logger.error(
          `NotchPay delete beneficiary failed: ${JSON.stringify(errorData)}`,
        );
        throw new BadRequestException(
          errorData.message || 'Failed to delete beneficiary',
        );
      }

      this.logger.log(`Beneficiary ${beneficiaryId} deleted successfully`);
    } catch (error) {
      this.logger.error(
        `NotchPay delete beneficiary error: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to delete beneficiary from NotchPay',
      );
    }
  }
}
