import axios, { AxiosError } from "axios";
import type { AxiosResponse, AxiosRequestConfig } from "axios";
import { logger } from "../utils/Logger";
import { toast } from "sonner";

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  success?: boolean;
  requestId?: string;
  errorId?: string;
}

export interface ApiError {
  error: string;
  message?: string;
  status?: number;
  requestId?: string;
  errorId?: string;
  details?: unknown;
}

const baseURL = import.meta.env.VITE_API_URL;
if (!baseURL) {
  console.warn(`VITE_API_URL is not defined`);
}

const apiClient = axios.create({
  baseURL: `${baseURL}/api`,
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "Cache-Control": "no-cache",
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  async (error) => {
    // 요청 생성 실패는 드물지만 에러 추적 필요
    logger.error("API Request Error", error, {
      message: "Failed to create request",
    });
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 성공 로그는 제거 (에러 추적 집중)
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const { response, message, config } = error;
    const errorData = response?.data;
    const errorMessage = errorData?.message || message || "알 수 없는 오류가 발생했습니다.";
    const errorId = errorData?.errorId || response?.headers["x-error-id"];
    const requestId = errorData?.requestId || response?.headers["x-request-id"];

    // 구조화된 에러 정보 (엔지니어 추적용)
    const errorContext = {
      method: config?.method?.toUpperCase(),
      url: config?.url,
      status: response?.status,
      statusText: response?.statusText,
      errorCode: errorData?.error,
      errorId, // 서버에서 받은 에러 ID
      requestId, // 요청 추적 ID
      requestData: config?.data,
      requestParams: config?.params,
      responseData: errorData,
      userAgent: navigator.userAgent,
      currentUrl: window.location.href,
    };

    // 에러 로깅 (서버로 전송)
    logger.error(`API Error: ${errorContext.method} ${errorContext.url}`, error, {
      ...errorContext,
      errorDetails: errorData?.details,
    });

    // 개발 환경: 콘솔에 상세 정보 출력
    if (import.meta.env.DEV) {
      console.groupCollapsed(`❌ API Error [${response?.status}] ${errorContext.method} ${errorContext.url}`);
      console.error("Error Summary:", {
        status: response?.status,
        errorCode: errorData?.error,
        message: errorMessage,
        errorId,
        requestId,
      });
      console.error("Request:", {
        method: errorContext.method,
        url: errorContext.url,
        params: errorContext.requestParams,
        data: errorContext.requestData,
      });
      console.error("Response:", {
        status: errorContext.status,
        data: errorContext.responseData,
      });
      if (errorData?.details) {
        console.error("Details:", errorData.details);
      }
      console.error("Full Error:", error);
      console.groupEnd();
    }

    // 사용자에게 에러 알림 (토스트)
    switch (response?.status) {
      case 401:
        // 401은 리다이렉트만 (토스트는 중복 방지)
        localStorage.removeItem("token");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        break;
      case 403:
        toast.error("접근 권한이 없습니다.");
        break;
      case 404:
        toast.error("요청한 리소스를 찾을 수 없습니다.");
        break;
      case 500:
        // 서버 에러는 상세 메시지 표시
        toast.error(errorMessage);
        break;
      case 502:
      case 503:
      case 504:
        toast.error("서버 연결 오류 - 잠시 후 다시 시도해주세요.");
        break;
      default:
        // 서버에서 제공한 메시지가 있으면 사용, 없으면 기본 메시지
        if (errorMessage && errorMessage !== message) {
          toast.error(errorMessage);
        } else if (response?.status) {
          toast.error(`요청 처리 중 오류가 발생했습니다. (${response.status})`);
        }
    }

    return Promise.reject(error);
  },
);

export const api = {
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.get<ApiResponse<T>>(url, config);
    return response.data.data as T;
  },

  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.post<ApiResponse<T>>(url, data, config);
    return response.data.data as T;
  },
};

export default apiClient;
export type { AxiosResponse, AxiosError };
