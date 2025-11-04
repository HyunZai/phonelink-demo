import type { UserDto } from "./user.types";
import type { ReportableType, ReasonType, ReportStatus } from "./constants";

// =================================================================
// Report Types
// =================================================================

export interface ReportDto {
  readonly id: number;
  reporterUserId?: UserDto["id"];
  reportableType: ReportableType;
  reportableId: number;
  reasonType: ReasonType;
  reasonDetail?: string;
  status: ReportStatus;
  adminId?: UserDto["id"];
  actionTaken?: string;
  handledAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt?: Date;
}

// 신고 생성 시 사용할 데이터
export type ReportCreateData = Pick<
  ReportDto,
  "reportableType" | "reportableId" | "reasonType" | "reasonDetail"
> & {
  reporterUserId: UserDto["id"];
};

// 신고 처리 시 사용할 데이터 (관리자용)
export type ReportProcessData = Pick<
  ReportDto,
  "id" | "status" | "actionTaken"
> & {
  adminId: UserDto["id"];
  handledAt: Date;
};

// 신고 목록 조회용 DTO
export type ReportListDto = Pick<
  ReportDto,
  "id" | "reportableType" | "reasonType" | "status" | "createdAt"
> & {
  reporterNickname?: UserDto["nickname"]; // 신고자 닉네임
};

// 신고 상세 조회용 DTO
export type ReportDetailDto = ReportDto & {
  reporter?: Pick<UserDto, "id" | "nickname" | "profileImageUrl" | "email">;
  admin?: Pick<UserDto, "id" | "nickname" | "email">;
  reportableTitle?: string;
  reportableContent?: string; // 신고 대상의 내용 (게시글 내용, 댓글 내용 등)
};

// =================================================================
// Query Types
// =================================================================
export interface ReportListQuery {
  status?: ReportStatus;
  reportableType?: ReportableType;
  reasonType?: ReasonType;
  reporterId?: UserDto["id"];
  adminId?: UserDto["id"];
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "handledAt";
  sortOrder?: "ASC" | "DESC";
}

// =================================================================
// Response Types
// =================================================================
export interface ReportListResponse {
  reports: ReportListDto[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// =================================================================
// Statistics Types
// =================================================================
export interface ReportStatsDto {
  totalReports: number;
  pendingReports: number;
  processingReports: number;
  resolvedReports: number;
  dismissedReports: number;
  reportsByType: {
    reportableType: ReportableType;
    count: number;
  }[];
  reportsByReason: {
    reasonType: ReasonType;
    count: number;
  }[];
  recentReports: ReportListDto[];
}
