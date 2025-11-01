import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/Logger";

// Request 타입 확장 - 로깅에 필요한 추가 속성들
interface RequestWithId extends Request {
  requestId: string; // 요청 추적을 위한 고유 ID
  startTime: number; // 요청 시작 시간 (응답 시간 계산용)
  user?: { id: string }; // 인증된 사용자 정보
}

/**
 * 요청 로깅 미들웨어 - 모든 HTTP 요청을 자동으로 로깅
 * 1. 요청 시작 시 로깅
 * 2. 응답 완료 시 로깅 (성공/실패 구분)
 * 3. 요청 ID 부여로 추적 가능
 */
export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const reqWithId = req as RequestWithId;

  // 요청 시작 시간 기록 (응답 시간 계산용)
  reqWithId.startTime = Date.now();
  reqWithId.requestId = uuidv4(); // 고유 요청 ID 생성

  // 요청 정보 수집 (로깅용 메타데이터)
  const requestInfo = {
    requestId: reqWithId.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("User-Agent"),
    userId: reqWithId.user?.id, // 인증된 사용자 ID
  };

  // 요청 시작 로깅은 제거 (에러 발생 시에만 상세 정보 기록으로 충분)

  // 응답 완료 시 로깅을 위한 res.send 오버라이드
  const originalSend = res.send;
  res.send = function (data) {
    const responseTime = Date.now() - reqWithId.startTime;

    const responseInfo = {
      ...requestInfo,
      statusCode: res.statusCode,
      responseTime,
    };

    // 에러 응답만 로깅 (성공 로그는 제거 - 에러 추적 집중)
    if (res.statusCode >= 400) {
      // 에러 응답은 ERROR 레벨로 로깅
      logger.error(
        `Request failed: ${req.method} ${req.originalUrl}`,
        undefined,
        {
          response: typeof data === "string" ? JSON.parse(data) : data,
          statusCode: res.statusCode,
        },
        responseInfo,
      );
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * 에러 로깅 미들웨어 - 처리되지 않은 에러를 자동으로 캐치하고 로깅
 * Express의 에러 핸들러로 사용 (app.use()의 마지막에 위치)
 */
export const errorLoggingMiddleware = (error: Error, req: Request, res: Response, next: NextFunction) => {
  const reqWithId = req as RequestWithId;
  const responseTime = Date.now() - reqWithId.startTime; // 에러 발생까지의 시간

  // 에러 정보 수집 (디버깅용 상세 정보)
  const errorInfo = {
    requestId: reqWithId.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("User-Agent"),
    userId: reqWithId.user?.id,
    statusCode: res.statusCode || 500,
    responseTime,
  };

  // 에러 로깅 (핵심: errorId 반환하여 응답에 포함)
  const errorId = logger.error(
    `Unhandled error in ${req.method} ${req.originalUrl}`,
    error,
    {
      request: {
        body: req.body,
        query: req.query,
        params: req.params,
      },
      headers: {
        // 민감 정보 제외
        authorization: req.headers.authorization ? "Bearer ***" : undefined,
        cookie: req.headers.cookie ? "***" : undefined,
      },
    },
    errorInfo,
  );

  // 응답이 이미 시작되었다면 Express 기본 에러 핸들러에 위임
  if (res.headersSent) return next(error);

  // 클라이언트에게 에러 응답 전송 (errorId 포함하여 추적 가능)
  res.setHeader("X-Error-Id", errorId); // 헤더에도 포함
  res.status(500).json({
    success: false,
    message: "Internal server error",
    requestId: reqWithId.requestId,
    errorId, // 에러 추적용 ID (엔지니어가 로그 검색 시 사용)
    ...(process.env.ENVIRONMENT === "dev" && {
      error: error.message,
      stack: error.stack,
    }),
  });
};
