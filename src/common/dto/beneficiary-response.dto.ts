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
  isDefault?: boolean; // Flag to mark default account in our system
}
