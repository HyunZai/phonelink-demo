// src/stores/reportStore.ts
import { create } from "zustand";
import { api } from "../api/axios";
import type { ReportableType, ReasonType } from "../../../shared/constants";
import type { ReportCreateData } from "../../../shared/report.types";
import { useAuthStore } from "./authStore";
import { toast } from "sonner";

// 스토어의 상태(state) 타입 정의
interface ReportState {
  isModalOpen: boolean;
  reportableType: ReportableType | null;
  reportableId: number | null;
  isLoading: boolean;
  error: string | null;
  navigate?: (path: string) => void;
}

// 스토어의 액션(action) 타입 정의
interface ReportActions {
  openModal: (reportableType: ReportableType, reportableId: number, checkAuth?: () => boolean) => void;
  closeModal: () => void;
  submitReport: (reasonType: ReasonType, reasonDetail?: string) => Promise<void>;
  clearError: () => void;
  setNavigate: (navigate: (path: string) => void) => void;
}

// 최종 스토어 타입
type ReportStore = ReportState & ReportActions;

export const useReportStore = create<ReportStore>((set, get) => {
  // 초기 상태 (Initial State)
  return {
    isModalOpen: false,
    reportableType: null,
    reportableId: null,
    isLoading: false,
    error: null,
    navigate: undefined,

    // Action: 신고 모달 열기
    openModal: (reportableType: ReportableType, reportableId: number, checkAuth?: () => boolean) => {
      // 로그인 체크가 필요한 경우
      if (checkAuth && !checkAuth()) {
        const { navigate } = get();
        if (navigate) {
          navigate("/login");
        } else {
          window.location.href = "/login";
        }
        toast.error("로그인이 필요합니다.");
        return;
      }

      set({
        isModalOpen: true,
        reportableType,
        reportableId,
        error: null,
      });
    },

    // Action: 신고 모달 닫기
    closeModal: () => {
      set({
        isModalOpen: false,
        reportableType: null,
        reportableId: null,
        error: null,
      });
    },

    // Action: 신고 제출
    submitReport: async (reasonType: ReasonType, reasonDetail?: string) => {
      const { reportableType, reportableId } = get();

      if (!reportableType || !reportableId) {
        set({ error: "신고 대상 정보가 없습니다." });
        return;
      }

      // authStore에서 현재 로그인한 사용자 정보 가져오기
      const { user } = useAuthStore.getState();

      if (!user?.id) {
        set({ error: "로그인이 필요합니다." });
        const { navigate } = get();
        if (navigate) {
          navigate("/login");
        } else {
          window.location.href = "/login";
        }
        toast.error("로그인이 필요합니다.");
        return;
      }

      set({ isLoading: true, error: null });

      try {
        // 공용 DTO 타입 사용
        const reportData: ReportCreateData = {
          reportableType,
          reportableId,
          reasonType,
          reasonDetail,
          reporterUserId: user.id,
        };

        await api.post("/report", reportData);

        toast.success("신고가 접수되었습니다.");
        get().closeModal();
      } catch (error: any) {
        console.error("신고 오류:", error);
        const errorMessage = error.response?.data?.message || "신고에 실패했습니다.";

        // 401 에러인 경우 로그인 페이지로 리다이렉트
        if (error.response?.status === 401) {
          const { navigate } = get();
          if (navigate) {
            navigate("/login");
          } else {
            window.location.href = "/login";
          }
          toast.error("로그인이 필요합니다.");
        } else {
          set({ error: errorMessage });
          toast.error(errorMessage);
        }
      } finally {
        set({ isLoading: false });
      }
    },

    // Action: 에러 메시지 초기화
    clearError: () => {
      set({ error: null });
    },

    // Action: 전역 네비게이션 함수 등록
    setNavigate: (navigate: (path: string) => void) => {
      set({ navigate });
    },
  };
});
