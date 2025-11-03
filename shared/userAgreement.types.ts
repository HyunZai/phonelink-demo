import type { UserDto } from "./user.types";

export interface UserAgreementDto {
  readonly id: number;
  readonly userId: UserDto["id"];
  agreePrivacyUse: boolean; // 개인정보 수집 및 이용 동의
  agreeAgeOver14: boolean; // 만 14세 이상 확인
  agreeTerms: boolean; // 이용약관 동의
  readonly agreedAt: Date;
  readonly updatedAt?: Date;
}

export type UserAgreementCreateData = Omit<
  UserAgreementDto,
  "id" | "agreedAt" | "updatedAt"
>;

export type UserAgreementUpdateData = Partial<
  Pick<UserAgreementDto, "agreePrivacyUse" | "agreeAgeOver14" | "agreeTerms">
>;
