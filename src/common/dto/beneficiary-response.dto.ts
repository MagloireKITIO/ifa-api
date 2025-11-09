/**
 * Response DTO for beneficiary data from NotchPay
 */
export class BeneficiaryResponseDto {
  id: string; // NotchPay beneficiary ID
  name: string;
  phone: string;
  email?: string;
  provider: string;
  country: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  isActive?: boolean; // Flag to mark if this beneficiary is currently active to receive payments
}
