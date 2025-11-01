import { Request, Response } from "express";
import { logger } from "./Logger";

interface RequestWithId extends Request {
  requestId: string;
  user?: { id: string };
}

interface ErrorResponseOptions {
  message: string;
  errorCode?: string;
  statusCode?: number;
  additionalContext?: Record<string, unknown>;
}

/**
 * 공통 에러 핸들러 - 모든 라우터에서 재사용 가능
 * 에러 추적에 필요한 모든 정보를 자동으로 수집하여 로깅 및 응답
 *
 * @param error - 발생한 에러 (unknown 타입)
 * @param req - Express Request 객체
 * @param res - Express Response 객체
 * @param options - 에러 응답 옵션
 */
export function handleError(error: unknown, req: Request, res: Response, options: ErrorResponseOptions): void {
  const reqWithId = req as RequestWithId;
  const { message, errorCode = "INTERNAL_SERVER_ERROR", statusCode = 500, additionalContext } = options;

  // 에러를 Error 객체로 변환
  const errorObj = error instanceof Error ? error : new Error(String(error));

  // 에러 로깅 (errorId 자동 생성 및 반환)
  const errorId = logger.error(
    message,
    errorObj,
    {
      query: req.query,
      params: req.params,
      body: req.method !== "GET" ? req.body : undefined,
      ...additionalContext,
    },
    {
      requestId: reqWithId.requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get("User-Agent"),
      userId: reqWithId.user?.id,
      statusCode,
    },
  );

  // 에러 응답 (표준 형식)
  res.status(statusCode).json({
    success: false,
    error: errorCode,
    message,
    requestId: reqWithId.requestId,
    errorId,
    ...(process.env.ENVIRONMENT === "dev" && {
      details:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
            }
          : error,
    }),
  });
}
