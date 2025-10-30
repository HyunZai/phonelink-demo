import { NextFunction, Request, Response, Router } from "express";
import fs from "fs";
import { MulterError } from "multer";
import path from "path";
import { ROLES } from "../../../shared/constants";
import { hasRole, isAuthenticated } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

// Multer 에러 핸들러
const handleUploadErrors = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "이미지 파일 크기는 5MB를 초과할 수 없습니다." });
    }
    return res.status(400).json({ message: `파일 업로드 오류: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

/**
 * @route   POST /api/upload/delete
 * @desc    이미지 삭제
 * @access  Private (User, Seller, Admin)
 */
router.post("/delete", isAuthenticated, (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.startsWith("/uploads/images/")) {
    return res.status(400).json({ message: "유효하지 않은 이미지 경로입니다." });
  }

  try {
    // __dirname은 현재 파일 위치 기준이므로, 프로젝트 루트부터 경로를 재구성합니다.
    //const filePath = path.join(__dirname, "../../", imageUrl.substring(1));
    const filePath = path.join("/app", imageUrl);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.status(200).json({ success: true, message: "이미지가 삭제되었습니다." });
    } else {
      // 파일이 없어도 에러를 반환하지 않고 성공으로 처리 (이미 삭제되었을 수 있으므로)
      res.status(200).json({ success: true, message: "이미지가 존재하지 않습니다." });
    }
  } catch (error) {
    console.error("이미지 삭제 중 오류 발생:", error);
    res.status(500).json({
      success: false,
      message: "이미지 삭제 중 오류가 발생했습니다.",
    });
  }
});

/**
 * @route   POST /api/upload/:type
 * @desc    이미지 업로드 (type: store, device, profile, post)
 * @access  Private (User, Seller, Admin)
 */
router.post(
  "/:type",
  isAuthenticated,
  hasRole([ROLES.USER, ROLES.SELLER, ROLES.ADMIN]),
  upload.single("image"), // 프론트엔드에서 'image'라는 key로 파일을 보내야 합니다.
  handleUploadErrors,
  (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: "이미지 파일이 없습니다." });
    }

    const type = req.params.type;
    const imageUrl = `/uploads/images/${type}/${req.file.filename}`;

    res.status(200).json({
      success: true,
      data: imageUrl,
    });
  },
);

export default router;
