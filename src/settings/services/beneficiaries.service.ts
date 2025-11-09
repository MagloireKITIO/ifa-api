import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Beneficiary } from '../../entities/beneficiary.entity';
import { NotchPayService } from '../../common/services';
import {
  CreateBeneficiaryDto,
  UpdateBeneficiaryDto,
  BeneficiaryResponseDto,
} from '../../common/dto';

/**
 * Service for managing beneficiaries (receiving accounts)
 * Handles both NotchPay API and local database storage
 */
@Injectable()
export class BeneficiariesService {
  private readonly logger = new Logger(BeneficiariesService.name);

  constructor(
    @InjectRepository(Beneficiary)
    private readonly beneficiaryRepository: Repository<Beneficiary>,
    private readonly notchPayService: NotchPayService,
  ) {}

  /**
   * Create a new beneficiary in both NotchPay and local database
   */
  async createBeneficiary(
    createBeneficiaryDto: CreateBeneficiaryDto,
  ): Promise<BeneficiaryResponseDto> {
    // Create in NotchPay first
    const notchpayBeneficiary =
      await this.notchPayService.createBeneficiary(createBeneficiaryDto);

    // Save to local database
    const beneficiary = this.beneficiaryRepository.create({
      notchpayId: notchpayBeneficiary.id,
      name: notchpayBeneficiary.name,
      phone: notchpayBeneficiary.phone,
      email: notchpayBeneficiary.email,
      // Use the original provider from DTO since NotchPay returns 'type' instead
      provider: createBeneficiaryDto.provider,
      country: notchpayBeneficiary.country,
      status: notchpayBeneficiary.status,
      isActive: false, // New beneficiaries are inactive by default
    });

    const saved = await this.beneficiaryRepository.save(beneficiary);

    return {
      id: saved.notchpayId,
      name: saved.name,
      phone: saved.phone,
      email: saved.email,
      provider: saved.provider,
      country: saved.country,
      status: saved.status as 'active' | 'inactive',
      createdAt: saved.createdAt,
      isActive: saved.isActive,
    };
  }

  /**
   * Get all beneficiaries from local database
   */
  async getBeneficiaries(): Promise<BeneficiaryResponseDto[]> {
    const beneficiaries = await this.beneficiaryRepository.find({
      order: { createdAt: 'DESC' },
    });

    return beneficiaries.map((b) => ({
      id: b.notchpayId,
      name: b.name,
      phone: b.phone,
      email: b.email,
      provider: b.provider,
      country: b.country,
      status: b.status as 'active' | 'inactive',
      createdAt: b.createdAt,
      isActive: b.isActive,
    }));
  }

  /**
   * Get a single beneficiary by NotchPay ID
   */
  async getBeneficiary(notchpayId: string): Promise<BeneficiaryResponseDto> {
    const beneficiary = await this.beneficiaryRepository.findOne({
      where: { notchpayId },
    });

    if (!beneficiary) {
      throw new NotFoundException(
        `Beneficiary with ID "${notchpayId}" not found`,
      );
    }

    return {
      id: beneficiary.notchpayId,
      name: beneficiary.name,
      phone: beneficiary.phone,
      email: beneficiary.email,
      provider: beneficiary.provider,
      country: beneficiary.country,
      status: beneficiary.status as 'active' | 'inactive',
      createdAt: beneficiary.createdAt,
      isActive: beneficiary.isActive,
    };
  }

  /**
   * Update a beneficiary in local database
   * Note: NotchPay API doesn't support updating beneficiaries, so we only update locally
   */
  async updateBeneficiary(
    notchpayId: string,
    updateBeneficiaryDto: UpdateBeneficiaryDto,
  ): Promise<BeneficiaryResponseDto> {
    const beneficiary = await this.beneficiaryRepository.findOne({
      where: { notchpayId },
    });

    if (!beneficiary) {
      throw new NotFoundException(
        `Beneficiary with ID "${notchpayId}" not found`,
      );
    }

    // Update only provided fields
    if (updateBeneficiaryDto.name !== undefined) {
      beneficiary.name = updateBeneficiaryDto.name;
    }
    if (updateBeneficiaryDto.phone !== undefined) {
      beneficiary.phone = updateBeneficiaryDto.phone;
    }
    if (updateBeneficiaryDto.email !== undefined) {
      beneficiary.email = updateBeneficiaryDto.email;
    }
    if (updateBeneficiaryDto.provider !== undefined) {
      beneficiary.provider = updateBeneficiaryDto.provider;
    }

    const updated = await this.beneficiaryRepository.save(beneficiary);

    this.logger.log(`Beneficiary ${notchpayId} updated successfully`);

    return {
      id: updated.notchpayId,
      name: updated.name,
      phone: updated.phone,
      email: updated.email,
      provider: updated.provider,
      country: updated.country,
      status: updated.status as 'active' | 'inactive',
      createdAt: updated.createdAt,
      isActive: updated.isActive,
    };
  }

  /**
   * Delete a beneficiary from both NotchPay and local database
   */
  async deleteBeneficiary(notchpayId: string): Promise<void> {
    const beneficiary = await this.beneficiaryRepository.findOne({
      where: { notchpayId },
    });

    if (!beneficiary) {
      throw new NotFoundException(
        `Beneficiary with ID "${notchpayId}" not found`,
      );
    }

    // Don't allow deleting the active beneficiary
    if (beneficiary.isActive) {
      throw new BadRequestException(
        'Cannot delete the active beneficiary. Please activate another beneficiary first.',
      );
    }

    // Delete from NotchPay
    await this.notchPayService.deleteBeneficiary(notchpayId);

    // Delete from local database
    await this.beneficiaryRepository.remove(beneficiary);

    this.logger.log(`Beneficiary ${notchpayId} deleted successfully`);
  }

  /**
   * Toggle beneficiary active status
   * Only one beneficiary can be active at a time
   */
  async toggleBeneficiary(notchpayId: string): Promise<BeneficiaryResponseDto> {
    const beneficiary = await this.beneficiaryRepository.findOne({
      where: { notchpayId },
    });

    if (!beneficiary) {
      throw new NotFoundException(
        `Beneficiary with ID "${notchpayId}" not found`,
      );
    }

    // If activating this beneficiary, deactivate all others
    if (!beneficiary.isActive) {
      await this.beneficiaryRepository.update(
        { isActive: true },
        { isActive: false },
      );

      beneficiary.isActive = true;
      this.logger.log(
        `Beneficiary ${notchpayId} activated as the receiving account`,
      );
    } else {
      // Deactivating - ensure at least one remains active
      const activeBeneficiaries = await this.beneficiaryRepository.count({
        where: { isActive: true },
      });

      if (activeBeneficiaries <= 1) {
        throw new BadRequestException(
          'Cannot deactivate the only active beneficiary. Please activate another beneficiary first.',
        );
      }

      beneficiary.isActive = false;
      this.logger.log(`Beneficiary ${notchpayId} deactivated`);
    }

    const updated = await this.beneficiaryRepository.save(beneficiary);

    return {
      id: updated.notchpayId,
      name: updated.name,
      phone: updated.phone,
      email: updated.email,
      provider: updated.provider,
      country: updated.country,
      status: updated.status as 'active' | 'inactive',
      createdAt: updated.createdAt,
      isActive: updated.isActive,
    };
  }

  /**
   * Get the currently active beneficiary
   */
  async getActiveBeneficiary(): Promise<Beneficiary | null> {
    return this.beneficiaryRepository.findOne({
      where: { isActive: true },
    });
  }

  /**
   * Sync beneficiaries from NotchPay to local database
   * Useful for initial setup or recovering from data loss
   */
  async syncFromNotchPay(): Promise<void> {
    const notchpayBeneficiaries =
      await this.notchPayService.getBeneficiaries();

    for (const nb of notchpayBeneficiaries) {
      const existing = await this.beneficiaryRepository.findOne({
        where: { notchpayId: nb.id },
      });

      if (!existing) {
        const beneficiary = this.beneficiaryRepository.create({
          notchpayId: nb.id,
          name: nb.name,
          phone: nb.phone,
          email: nb.email,
          provider: nb.provider,
          country: nb.country,
          status: nb.status,
          isActive: false,
        });

        await this.beneficiaryRepository.save(beneficiary);
        this.logger.log(`Synced beneficiary ${nb.id} from NotchPay`);
      }
    }

    this.logger.log('Beneficiary sync completed');
  }
}
