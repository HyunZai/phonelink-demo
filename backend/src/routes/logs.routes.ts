import { Router, Request, Response } from "express";
import { logger } from "../utils/Logger";
import { handleError } from "../utils/errorHandler";

// Express Request 타입 확장
declare module "express-serve-static-core" {
  interface Request {
    requestId: string;
  }
}

const router = Router();

// 프론트엔드에서 전송된 로그를 받는 엔드포인트
router.post("/", async (req: Request, res: Response) => {
  try {
    const logEntry = req.body;

    // 프론트엔드 로그를 백엔드 로거로 전송
    logger.info(
      `Frontend Log: ${logEntry.message}`,
      {
        frontendLog: logEntry,
        source: "frontend",
      },
      {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
      },
    );

    res.status(200).json({ success: true });
  } catch (error) {
    handleError(error, req, res, {
      message: "프론트엔드 로그 처리 중 오류가 발생했습니다.",
      errorCode: "PROCESS_FRONTEND_LOG_ERROR",
      additionalContext: { logEntry: req.body },
    });
  }
});

export default router;
