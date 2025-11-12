import { create } from "zustand";
import type { UserAgreementCreateData } from "../../../shared/userAgreement.types";

export type SignupFlowType = "LOCAL" | "SSO";

type AgreementField = "agreePrivacyUse" | "agreeAgeOver14" | "agreeTerms";

type StoredAgreementState = Pick<UserAgreementCreateData, AgreementField> & {
  userId: UserAgreementCreateData["userId"];
};

export type SsoSignupData = {
  email?: string;
  name?: string;
  gender?: string;
  phoneNumber?: string;
  birthYear?: string | number;
  birthday?: string;
  profileImageUrl?: string;
  [key: string]: unknown;
};

interface SignupState {
  agreements: StoredAgreementState;
  agreementsAcceptedAt: number | null;
  flow: SignupFlowType | null;
  ssoSignupToken: string | null;
  ssoSignupData: SsoSignupData | null;
}

interface SignupActions {
  setSignupFlow: (flow: SignupFlowType | null) => void;
  setAgreementUserId: (userId: number) => void;
  setAgreementField: (field: AgreementField, value: boolean) => void;
  setAgreements: (agreements: Partial<StoredAgreementState>) => void;
  setAllAgreements: (value: boolean, options?: { userId?: number }) => void;
  clearAgreements: () => void;
  hasAcceptedAll: () => boolean;
  setSsoSignupContext: (token: string | null, data: SsoSignupData | null) => void;
  clearSsoSignupContext: () => void;
  resetSignup: () => void;
}

type SignupStore = SignupState & SignupActions;

const DEFAULT_AGREEMENTS: StoredAgreementState = {
  userId: 0,
  agreePrivacyUse: false,
  agreeAgeOver14: false,
  agreeTerms: false,
};

const SESSION_KEYS = {
  AGREEMENTS: "signupAgreements",
  SSO_TOKEN: "ssoSignupToken",
  SSO_DATA: "ssoSignupData",
} as const;

const canUseSessionStorage = typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

const readSessionJSON = <T>(key: string, fallback: T): T => {
  if (!canUseSessionStorage) {
    return fallback;
  }

  const raw = window.sessionStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[signupStore] Failed to parse sessionStorage item: ${key}`, error);
    return fallback;
  }
};

const writeSessionJSON = (key: string, value: unknown) => {
  if (!canUseSessionStorage) {
    return;
  }

  if (value === null || value === undefined) {
    window.sessionStorage.removeItem(key);
    return;
  }

  window.sessionStorage.setItem(key, JSON.stringify(value));
};

const writeSessionValue = (key: string, value: string | null | undefined) => {
  if (!canUseSessionStorage) {
    return;
  }

  if (value === null || value === undefined) {
    window.sessionStorage.removeItem(key);
    return;
  }

  window.sessionStorage.setItem(key, value);
};

const hasAllAgreements = (agreements: StoredAgreementState) =>
  agreements.agreePrivacyUse && agreements.agreeAgeOver14 && agreements.agreeTerms;

const getInitialAgreements = (): StoredAgreementState => {
  const stored = readSessionJSON<StoredAgreementState | null>(SESSION_KEYS.AGREEMENTS, null);
  if (!stored) {
    return { ...DEFAULT_AGREEMENTS };
  }

  return {
    ...DEFAULT_AGREEMENTS,
    ...stored,
    userId: typeof stored.userId === "number" ? stored.userId : DEFAULT_AGREEMENTS.userId,
  };
};

const getInitialSsoToken = (): string | null => {
  if (!canUseSessionStorage) {
    return null;
  }
  return window.sessionStorage.getItem(SESSION_KEYS.SSO_TOKEN);
};

const getInitialSsoData = (): SsoSignupData | null =>
  readSessionJSON<SsoSignupData | null>(SESSION_KEYS.SSO_DATA, null);

export const useSignupStore = create<SignupStore>((set, get) => {
  const initialAgreements = getInitialAgreements();

  return {
    agreements: initialAgreements,
    agreementsAcceptedAt: hasAllAgreements(initialAgreements) ? Date.now() : null,
    flow: null,
    ssoSignupToken: getInitialSsoToken(),
    ssoSignupData: getInitialSsoData(),

    setSignupFlow: (flow) => set({ flow }),

    setAgreementUserId: (userId) =>
      set((state) => {
        const agreements = { ...state.agreements, userId };
        writeSessionJSON(SESSION_KEYS.AGREEMENTS, agreements);
        return { agreements };
      }),

    setAgreementField: (field, value) =>
      set((state) => {
        const agreements = { ...state.agreements, [field]: value } as StoredAgreementState;
        writeSessionJSON(SESSION_KEYS.AGREEMENTS, agreements);
        return {
          agreements,
          agreementsAcceptedAt: hasAllAgreements(agreements) ? Date.now() : null,
        };
      }),

    setAgreements: (agreementsPartial) =>
      set((state) => {
        const agreements = {
          ...state.agreements,
          ...agreementsPartial,
        } as StoredAgreementState;
        writeSessionJSON(SESSION_KEYS.AGREEMENTS, agreements);
        return {
          agreements,
          agreementsAcceptedAt: hasAllAgreements(agreements) ? Date.now() : null,
        };
      }),

    setAllAgreements: (value, options) =>
      set((state) => {
        const agreements: StoredAgreementState = {
          userId: options?.userId ?? state.agreements.userId ?? DEFAULT_AGREEMENTS.userId,
          agreePrivacyUse: value,
          agreeAgeOver14: value,
          agreeTerms: value,
        };
        writeSessionJSON(SESSION_KEYS.AGREEMENTS, agreements);
        return {
          agreements,
          agreementsAcceptedAt: value ? Date.now() : null,
        };
      }),

    clearAgreements: () => {
      writeSessionJSON(SESSION_KEYS.AGREEMENTS, null);
      set({ agreements: { ...DEFAULT_AGREEMENTS }, agreementsAcceptedAt: null });
    },

    hasAcceptedAll: () => hasAllAgreements(get().agreements),

    setSsoSignupContext: (token, data) => {
      writeSessionValue(SESSION_KEYS.SSO_TOKEN, token);
      writeSessionJSON(SESSION_KEYS.SSO_DATA, data);
      set({
        ssoSignupToken: token ?? null,
        ssoSignupData: data ?? null,
        flow: token ? "SSO" : get().flow,
      });
    },

    clearSsoSignupContext: () => {
      writeSessionValue(SESSION_KEYS.SSO_TOKEN, null);
      writeSessionJSON(SESSION_KEYS.SSO_DATA, null);
      set({ ssoSignupToken: null, ssoSignupData: null });
    },

    resetSignup: () => {
      writeSessionJSON(SESSION_KEYS.AGREEMENTS, null);
      writeSessionValue(SESSION_KEYS.SSO_TOKEN, null);
      writeSessionJSON(SESSION_KEYS.SSO_DATA, null);
      set({
        agreements: { ...DEFAULT_AGREEMENTS },
        agreementsAcceptedAt: null,
        flow: null,
        ssoSignupToken: null,
        ssoSignupData: null,
      });
    },
  };
});
