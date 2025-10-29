export const ROLES = {
  USER: "USER",
  SELLER: "SELLER",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const OFFER_TYPES = {
  MNP: "MNP",
  CHG: "CHG",
} as const;

export type OfferType = (typeof OFFER_TYPES)[keyof typeof OFFER_TYPES];

export const USER_STATUSES = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  WITHDRAWN: "WITHDRAWN",
} as const;

export type UserStatus = (typeof USER_STATUSES)[keyof typeof USER_STATUSES];

export const SELLER_STATUSES = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  PENDING: "PENDING",
  REJECTED: "REJECTED",
} as const;

export const APPROVAL_STATUSES = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const SSO_PROVIDERS = {
  GOOGLE: "google",
  KAKAO: "kakao",
  NAVER: "naver",
  APPLE: "apple",
} as const;

export type SsoProvider = (typeof SSO_PROVIDERS)[keyof typeof SSO_PROVIDERS];

export const CARRIERS = {
  SKT: "SKT",
  KT: "KT",
  LG: "LG U+",
} as const;

export const SORT_ORDER = {
  DEFAULT: "default",
  PRICE_ASC: "price_asc",
  PRICE_DESC: "price_desc",
} as const;

export type SortOrder = (typeof SORT_ORDER)[keyof typeof SORT_ORDER];

export const REPORTABLE_TYPES = {
  POST: "POST",
  COMMENT: "COMMENT",
  USER: "USER",
  STORE: "STORE",
} as const;

export type ReportableType =
  (typeof REPORTABLE_TYPES)[keyof typeof REPORTABLE_TYPES];

export const REASON_TYPES = {
  SPAM: "SPAM",
  ABUSE: "ABUSE",
  OBSCENITY: "OBSCENITY",
  ILLEGAL: "ILLEGAL",
  PRIVACY: "PRIVACY",
  COPYRIGHT: "COPYRIGHT",
  OTHER: "OTHER",
} as const;

export type ReasonType = (typeof REASON_TYPES)[keyof typeof REASON_TYPES];

export const REPORT_STATUSES = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  RESOLVED: "RESOLVED",
  DISMISSED: "DISMISSED",
} as const;

export type ReportStatus =
  (typeof REPORT_STATUSES)[keyof typeof REPORT_STATUSES];
