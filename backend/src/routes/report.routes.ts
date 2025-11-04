import { Router } from "express";
import { AppDataSource } from "../db";
import { handleError } from "../utils/errorHandler";
import { ReportCreateData } from "../../../shared/types";
import { Report } from "../typeorm/reports.entity";
import { REPORT_STATUSES } from "../../../shared/constants";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

// 신고 접수
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const reportData: ReportCreateData = req.body;
    const reportRepo = AppDataSource.getRepository(Report);

    // 중복 신고 확인
    const existingReport = await reportRepo.findOne({
      where: {
        reporterUserId: reportData.reporterUserId,
        reportableType: reportData.reportableType,
        reportableId: reportData.reportableId,
      },
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: "이미 신고접수가 완료된 건입니다.",
      });
    }

    const report = reportRepo.create({ ...reportData, status: REPORT_STATUSES.PENDING });
    await reportRepo.save(report);

    res.status(200).json({
      success: true,
      message: "신고가 접수되었습니다.",
      data: report,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "신고 접수 중 오류가 발생했습니다.",
      errorCode: "REPORT_SUBMISSION_ERROR",
    });
  }
});

export default router;
