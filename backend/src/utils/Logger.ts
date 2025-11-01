import path from "path";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { v4 as uuidv4 } from "uuid";

export enum LogLevel {
  ERROR = "ERROR",
  WARN = "WARN",
  INFO = "INFO",
  DEBUG = "DEBUG",
}

// 파일 로그용 포맷 - 가독성 좋은 JSON 포맷
const fileFormat = winston.format.printf((info) => {
  const { timestamp, level, message, ...meta } = info;
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
  };
  // JSON을 예쁘게 포맷팅 (2칸 들여쓰기) + 구분선 추가
  return `${"=".repeat(80)}\n${JSON.stringify(logEntry, null, 2)}\n`;
});

// Winston 형식 - 파일용 (가독성 좋은 JSON)
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  fileFormat,
);

// 콘솔 포맷 (개발 환경에서만)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf((info) => {
    const { timestamp, level, message, errorId, requestId, error } = info;
    const importantMeta: Record<string, unknown> = {};
    if (errorId) importantMeta.errorId = errorId;
    if (requestId) importantMeta.requestId = requestId;
    if (error) importantMeta.error = error;
    const metaStr = Object.keys(importantMeta).length ? JSON.stringify(importantMeta, null, 2) : "";
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  }),
);

class Logger {
  private winstonLogger: winston.Logger;
  private logDir: string;

  constructor() {
    this.logDir = path.join(process.cwd(), "logs");

    const transports: winston.transport[] = [];

    // ERROR 로그 파일(별도 파일로 분리)
    transports.push(
      new DailyRotateFile({
        dirname: this.logDir,
        filename: "error-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        level: "error",
        format: logFormat,
        maxSize: "20m",
        maxFiles: "30d", // 에러는 30일 보관
      }),
    );

    // 통합 로그 파일 (모든 레벨)
    transports.push(
      new DailyRotateFile({
        dirname: this.logDir,
        filename: "combined-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        format: logFormat,
        maxSize: "20m",
        maxFiles: "7d", // 일반 로그는 7일 보관
      }),
    );

    // 콘솔 출력 (환경별 설정)
    // 프로덕션에서는 파일 로그만 사용, 개발 환경에서는 콘솔 포맷 사용
    transports.push(
      new winston.transports.Console({
        format: process.env.ENVIRONMENT === "dev" ? consoleFormat : fileFormat,
        level: process.env.ENVIRONMENT === "dev" ? "debug" : "error", // 프로덕션에서는 ERROR만
      }),
    );

    this.winstonLogger = winston.createLogger({
      level: process.env.LOG_LEVEL || (process.env.ENVIRONMENT === "dev" ? "debug" : "info"),
      format: logFormat,
      transports,
      exceptionHandlers: [
        new DailyRotateFile({
          dirname: this.logDir,
          filename: "exceptions-%DATE%.log",
          datePattern: "YYYY-MM-DD",
          format: logFormat,
          maxSize: "20m",
          maxFiles: "30d",
        }),
      ],
      rejectionHandlers: [
        new DailyRotateFile({
          dirname: this.logDir,
          filename: "rejections-%DATE%.log",
          datePattern: "YYYY-MM-DD",
          format: logFormat,
          maxSize: "20m",
          maxFiles: "30d",
        }),
      ],
    });
  }

  private getCallerInfo(error?: Error): { file: string; line: number; function: string } {
    const stack = error?.stack || new Error().stack;
    if (!stack) {
      return { file: "unknown", line: 0, function: "unknown" };
    }

    const lines = stack.split("\n");
    // 실제 에러 발생 위치 찾기 (Logger 메서드 호출을 건너뛰고)
    const callerLine = lines[4] || lines[3] || lines[2];

    if (!callerLine) {
      return { file: "unknown", line: 0, function: "unknown" };
    }

    const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):\d+\)/) || callerLine.match(/at\s+(.+?):(\d+):\d+/);

    if (match) {
      return {
        function: match[1] || "anonymous",
        file: match[2] || "unknown",
        line: parseInt(match[3] || "0", 10),
      };
    }

    return { file: "unknown", line: 0, function: "unknown" };
  }

  private buildErrorMeta(
    message: string,
    error?: Error,
    additionalData?: unknown,
    requestInfo?: {
      requestId?: string;
      userId?: string;
      ip?: string;
      userAgent?: string;
      method?: string;
      url?: string;
      statusCode?: number;
      responseTime?: number;
    },
  ): Record<string, unknown> {
    const errorId = uuidv4(); // 에러 추적용 고유 ID
    const callerInfo = this.getCallerInfo(error);

    const meta: Record<string, unknown> = {
      // 에러 추적 ID
      errorId,
      // 에러 기본 정보
      message,
      // 에러 상세 (ERROR 레벨일 때만)
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
      // 발생 위치
      source: {
        file: callerInfo.file,
        line: callerInfo.line,
        function: callerInfo.function,
      },
      // 요청 컨텍스트 (에러 추적)
      ...(requestInfo && {
        request: {
          id: requestInfo.requestId,
          method: requestInfo.method,
          url: requestInfo.url,
          statusCode: requestInfo.statusCode,
          responseTime: requestInfo.responseTime ? `${requestInfo.responseTime}ms` : undefined,
        },
        user: {
          id: requestInfo.userId,
          ip: requestInfo.ip,
          userAgent: requestInfo.userAgent,
        },
      }),
    };
    if (additionalData) {
      meta.context = additionalData;
    }

    return meta;
  }

  // ERROR: 에러 추적에 최적화 (동기적으로 에러 ID 생성 후 반환)
  error(
    message: string,
    error?: Error,
    additionalData?: unknown,
    requestInfo?: {
      requestId?: string;
      userId?: string;
      ip?: string;
      userAgent?: string;
      method?: string;
      url?: string;
      statusCode?: number;
      responseTime?: number;
    },
  ): string {
    // 에러 ID 생성 (응답에도 포함하여 추적 가능)
    const errorId = uuidv4();
    const meta = this.buildErrorMeta(message, error, additionalData, requestInfo);
    meta.errorId = errorId;

    this.winstonLogger.error(message, meta);
    return errorId; // 에러 ID 반환
  }

  // WARN: 경고 로그
  warn(
    message: string,
    additionalData?: unknown,
    requestInfo?: {
      requestId?: string;
      userId?: string;
      ip?: string;
      userAgent?: string;
      method?: string;
      url?: string;
      statusCode?: number;
      responseTime?: number;
    },
  ): void {
    const meta: Record<string, unknown> = {
      message,
    };
    if (requestInfo) {
      meta.request = {
        id: requestInfo.requestId,
        method: requestInfo.method,
        url: requestInfo.url,
      };
      meta.user = {
        id: requestInfo.userId,
      };
    }
    if (additionalData) {
      meta.context = additionalData;
    }
    this.winstonLogger.warn(message, meta);
  }

  // INFO: 중요 정보만 (에러 추적에 도움되는 것만)
  info(
    message: string,
    additionalData?: unknown,
    requestInfo?: {
      requestId?: string;
      userId?: string;
      ip?: string;
      userAgent?: string;
      method?: string;
      url?: string;
      statusCode?: number;
      responseTime?: number;
    },
  ): void {
    const meta: Record<string, unknown> = {};
    if (requestInfo) {
      meta.request = {
        id: requestInfo.requestId,
        method: requestInfo.method,
        url: requestInfo.url,
        responseTime: requestInfo.responseTime ? `${requestInfo.responseTime}ms` : undefined,
      };
    }
    if (additionalData) {
      meta.context = additionalData;
    }
    this.winstonLogger.info(message, meta);
  }

  // DEBUG: 개발 환경에서만
  debug(
    message: string,
    additionalData?: unknown,
    requestInfo?: {
      requestId?: string;
      userId?: string;
      ip?: string;
      userAgent?: string;
      method?: string;
      url?: string;
      statusCode?: number;
      responseTime?: number;
    },
  ): void {
    if (process.env.ENVIRONMENT === "dev") {
      const meta: Record<string, unknown> = {};
      if (requestInfo) {
        meta.requestId = requestInfo.requestId;
      }
      if (additionalData) {
        meta.context = additionalData;
      }
      this.winstonLogger.debug(message, meta);
    }
  }
}

export const logger = new Logger();
