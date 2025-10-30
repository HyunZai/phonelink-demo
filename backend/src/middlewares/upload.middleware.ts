import fs from "fs";
import { Request } from "express";
import multer from "multer";
import path from "path";

// 허용된 업로드 타입과 디렉토리명
const ALLOWED_TYPES = ["store", "device", "profile", "post", "carrier"] as const;
type UploadType = (typeof ALLOWED_TYPES)[number];

//const baseUploadDir = path.join(__dirname, "../../uploads/images");
const baseUploadDir = "/app/uploads/images";

// Multer 스토리지 설정
const storage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const type = req.params.type as UploadType;

    // 허용된 타입이 아니면 에러 처리
    if (!ALLOWED_TYPES.includes(type)) {
      return cb(new Error("유효하지 않은 업로드 타입입니다."), "");
    }

    // 타입에 맞는 디렉토리 경로 설정 및 생성
    const uploadDir = path.join(baseUploadDir, type);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 파일명 중복 방지를 위해 타임스탬프와 랜덤 숫자 추가
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname);
    // fieldname은 프론트에서 formData에 append할 때 사용한 key 값입니다. (예: 'image', 'thumbnail')
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  },
});

// Multer 인스턴스 생성 및 export
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
  },
  fileFilter: (req, file, cb) => {
    // 이미지 파일 형식만 허용
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("이미지 파일만 업로드할 수 있습니다."));
    }
  },
});
