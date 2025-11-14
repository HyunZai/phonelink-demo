//-----------------------------
// 회원가입 기본 정보
//-----------------------------
export interface SignupUserInfo {
  email: string;
  password?: string; // SSO는 없음
  name: string;
  nickname?: string;
  gender: "M" | "F" | ""; // 선택 전에는 빈값
  birthYear?: number;
  birthday?: string; // MM-DD
  ageRange?: string; // e.g. "20-29"
  phoneNumber: string;

  // 주소
  postalCode?: string;
  sido?: string;
  sigungu?: string;
  address?: string;
  addressDetail?: string;

  // SSO provider 정보
  provider?: "local" | "google" | "kakao" | "naver";
}

/** -----------------------------
 *  약관 동의 정보
 * ----------------------------- */
export interface AgreementState {
  agreePrivacyUse: boolean; // 개인정보 수집 및 이용 동의
  agreeAgeOver14: boolean; // 만 14세 이상
  agreeTerms: boolean; // 이용약관
}

/** -----------------------------
 *  회원가입 전체 페이로드
 *  (users + user_agreements)
 * ----------------------------- */
export interface FinalSignupPayload {
  user: SignupUserInfo;
  agreements: AgreementState;
}
