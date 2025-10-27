import axios, { AxiosError } from "axios";
import type { AxiosResponse, AxiosRequestConfig } from "axios";
import { logger } from "../utils/Logger";

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  success?: boolean;
}

export interface ApiError {
  error: string;
  message?: string;
  status?: number;
}

const baseURL = import.meta.env.VITE_API_URL;
if (!baseURL) {
  //throw new Error("VITE_API_URL is not defined. Please check your .env file.");
  console.log(`VITE_API_URL is ${baseURL}`);
}

// Axios 인스턴스 생성
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

// 인터셉터
// TODO: JWT 토큰 인증 로직
apiClient.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 요청 로깅
    await logger.info(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      headers: config.headers,
      data: config.data,
      params: config.params,
    });

    return config;
  },
  async (error) => {
    await logger.error("API Request Error", error, {
      message: "Failed to process request",
    });
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  async (response: AxiosResponse) => {
    // 성공 응답 로깅
    await logger.info(`API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      responseTime: Date.now() - (response.config as any).startTime,
      dataSize: JSON.stringify(response.data).length,
    });

    // 개발 환경에서만 콘솔에도 출력
    if (import.meta.env.VITE_DEV_MODE) {
      console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
        timestamp: new Date().toISOString(),
      });
    }
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const { response, message, config } = error;
    const errorMessage = response?.data?.message || message;

    // 로깅할 정보를 하나의 객체로 통합
    const requestInfo = {
      method: config?.method?.toUpperCase(),
      url: config?.url,
      status: response?.status,
      message: errorMessage,
      responseData: response?.data, // 응답 데이터를 객체에 포함
      timestamp: new Date().toISOString(),
    };

    // 에러 로깅
    await logger.error(`API Error: ${requestInfo.method} ${requestInfo.url}`, error, {
      status: response?.status,
      responseData: response?.data,
      requestData: config?.data,
      headers: config?.headers,
    });

    console.groupCollapsed(`❌ API Error: ${requestInfo.method} ${requestInfo.url}`);
    console.error("Request Info:", requestInfo);
    console.error("Full Error Object:", error);
    console.groupEnd();

    switch (response?.status) {
      case 401:
        console.warn("🔐 인증 실패 - 로그인 페이지로 리다이렉트");
        localStorage.removeItem("token");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        break;
      case 403:
        console.warn("🚫 접근 권한이 없습니다.");
        break;
      case 404:
        console.warn("🔍 요청한 리소스를 찾을 수 없습니다.");
        break;
      case 500:
        console.error("💥 서버 내부 오류가 발생했습니다.");
        break;
      case 502:
      case 503:
      case 504:
        console.error("🌐 서버 연결 오류 - 잠시 후 다시 시도해주세요.");
        break;
      default:
        console.error(`⚠️ 알 수 없는 오류 (${response?.status}): ${errorMessage}`);
    }

    return Promise.reject(error);
  },
);

// response.data를 직접 반환하고, 불필요한 메서드 제거 - 미사용 중
export const api = {
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.get<ApiResponse<T>>(url, config);
    return response.data.data as T; // 실제 데이터인 response.data.data를 직접 반환
  },

  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.post<ApiResponse<T>>(url, data, config);
    return response.data.data as T; // 실제 데이터인 response.data.data를 직접 반환
  },
};

export default apiClient;
export type { AxiosResponse, AxiosError };
