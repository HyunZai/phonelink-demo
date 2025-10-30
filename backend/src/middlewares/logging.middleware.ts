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

  // 요청 시작 로깅 (모든 요청에 대해)
  logger.info(
    `Request started: ${req.method} ${req.originalUrl}`,
    {
      headers: req.headers,
      query: req.query,
      body: req.method !== "GET" ? req.body : undefined, // GET 요청은 body 로깅 생략
    },
    requestInfo,
  );

  // 응답 완료 시 로깅을 위한 res.send 오버라이드
  const originalSend = res.send;
  res.send = function (data) {
    const responseTime = Date.now() - reqWithId.startTime; // 응답 시간 계산

    const responseInfo = {
      ...requestInfo,
      statusCode: res.statusCode,
      responseTime,
    };

    // HTTP 상태 코드에 따른 로깅 레벨 구분
    if (res.statusCode >= 400) {
      // 에러 응답 로깅 (4xx, 5xx)
      logger.error(
        `Request failed: ${req.method} ${req.originalUrl}`,
        undefined,
        {
          responseData: data,
          statusCode: res.statusCode,
        },
        responseInfo,
      );
    } else {
      // 성공 응답 로깅 (2xx, 3xx)
      logger.info(
        `Request completed: ${req.method} ${req.originalUrl}`,
        {
          responseSize: JSON.stringify(data).length, // 응답 크기 정보
        },
        responseInfo,
      );
    }

    return originalSend.call(this, data); // 원본 send 메서드 호출
  };

  next();
};

/**
 * 에러 로깅 미들웨어 - 처리되지 않은 에러를 자동으로 캐치하고 로깅
 * Express의 에러 핸들러로 사용 (app.use()의 마지막에 위치)
 */
export const errorLoggingMiddleware = (error: Error, req: Request, res: Response) => {
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

  // 에러 로깅 (스택 트레이스 포함)
  logger.error(
    `Unhandled error in ${req.method} ${req.originalUrl}`,
    error,
    {
      requestBody: req.body, // 요청 본문 (디버깅용)
      requestQuery: req.query, // 쿼리 파라미터
      requestHeaders: req.headers, // 요청 헤더
    },
    errorInfo,
  );

  // 클라이언트에게 에러 응답 전송
  res.status(500).json({
    success: false,
    message: "Internal server error",
    requestId: reqWithId.requestId, // 에러 추적을 위한 요청 ID
    ...(process.env.ENVIRONMENT === "dev" && {
      error: error.message, // 개발 환경에서만 에러 메시지 노출
      stack: error.stack, // 개발 환경에서만 스택 트레이스 노출
    }),
  });
};
