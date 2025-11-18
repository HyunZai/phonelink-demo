import { create } from "zustand";
import { ROLES } from "../../../shared/constants";
import type { SignupUserInfo, AgreementState, FinalSignupPayload } from "../../../shared/user_v2.types";

interface SignupStoreState {
  // 1단계: 약관 동의
  agreements: AgreementState;

  // 2단계: 기본 회원정보
  userInfo: SignupUserInfo;

  // 흐름 제어
  currentStep: number; // 1: 동의 → 2: 정보 입력

  // 액션
  setAgreement: (key: keyof AgreementState, value: boolean) => void;
  setAgreements: (next: Partial<AgreementState>) => void;
  setUserInfo: (key: keyof SignupUserInfo, value: any) => void;
  loadSocialUserInfo: (data: Partial<SignupUserInfo>) => void;
  nextStep: () => void;
  reset: () => void;

  // 최종 제출 페이로드 생성
  buildPayload: () => FinalSignupPayload;
}

export const useSignupStore = create<SignupStoreState>((set, get) => ({
  // 초기값
  agreements: {
    agreePrivacyUse: false,
    agreeAgeOver14: false,
    agreeTerms: false,
  },

  userInfo: {
    email: "",
    password: "",
    name: "",
    nickname: "",
    gender: "M",
    birthYear: undefined,
    birthday: "",
    ageRange: "",
    phoneNumber: "",
    postalCode: "",
    sido: "",
    sigungu: "",
    address: "",
    addressDetail: "",
    provider: "local",
    role: ROLES.USER,
    lastLoginType: "",
    storeId: undefined,
  },

  currentStep: 1,

  // 동의항목 업데이트
  setAgreement: (key, value) =>
    set((state) => ({
      agreements: {
        ...state.agreements,
        [key]: value,
      },
    })),

  setAgreements: (next) =>
    set((state) => ({
      agreements: {
        ...state.agreements,
        ...next,
      },
    })),

  // 일반 사용자 정보 업데이트
  setUserInfo: (key, value) =>
    set((state) => ({
      userInfo: {
        ...state.userInfo,
        [key]: value,
      },
    })),

  // 소셜 로그인으로 받아온 정보 업데이트
  // (email, name, gender 등 자동 세팅됨)
  loadSocialUserInfo: (data) =>
    set((state) => ({
      userInfo: {
        ...state.userInfo,
        ...data,
        provider: data.provider ?? state.userInfo.provider,
      },
    })),

  // 단계 이동
  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, 2),
    })),

  // 전부 초기화
  reset: () =>
    set({
      agreements: {
        agreePrivacyUse: false,
        agreeAgeOver14: false,
        agreeTerms: false,
      },
      userInfo: {
        email: "",
        password: "",
        name: "",
        nickname: "",
        gender: "M",
        birthYear: undefined,
        birthday: "",
        ageRange: "",
        phoneNumber: "",
        postalCode: "",
        sido: "",
        sigungu: "",
        address: "",
        addressDetail: "",
        provider: "local",
        role: ROLES.USER,
        lastLoginType: "",
        storeId: undefined,
      },
      currentStep: 1,
    }),

  // 최종 제출 데이터(users + user_agreements)
  buildPayload: () => ({
    user: get().userInfo,
    agreements: get().agreements,
  }),
}));
