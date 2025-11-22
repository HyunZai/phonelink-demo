import { create } from "zustand";
import { ROLES } from "../../../shared/constants";
import type { SignupUserInfo, AgreementState } from "../../../shared/user_v2.types";

interface SignupStoreState {
  isSsoSignup: boolean;

  // 1단계: 약관 동의
  agreements: AgreementState;

  // 2단계: 기본 회원정보
  userInfo: SignupUserInfo;

  // 흐름 제어
  currentStep: number; // 1: 동의 → 2: 정보 입력

  // 액션
  setIsSsoSignup: (value: boolean) => void;
  setAgreement: (key: keyof AgreementState, value: boolean) => void;
  setUserInfo: (key: keyof SignupUserInfo, value: any) => void;
  loadSocialUserInfo: (data: Partial<SignupUserInfo>) => void;
  nextStep: () => void;
  reset: () => void;
}

export const useSignupStore = create<SignupStoreState>((set) => ({
  // 초기값
  isSsoSignup: false,

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

  setIsSsoSignup: (value: boolean) =>
    set({
      isSsoSignup: value,
    }),

  // 동의항목 업데이트
  setAgreement: (key, value) =>
    set((state) => ({
      agreements: {
        ...state.agreements,
        [key]: value,
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
}));
