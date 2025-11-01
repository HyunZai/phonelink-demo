import { Router, Request, Response } from "express";
import { AppDataSource } from "../db";
import { Region } from "../typeorm/regions.entity";
import { SelectQueryBuilder } from "typeorm";
import { OfferRegionDto } from "shared/region.types";
import { handleError } from "../utils/errorHandler";

// 시/군/구 조회 요청 인터페이스
interface RegionRequest extends Request {
  query: {
    sidoCode?: string;
  };
}
const router = Router();

// 공통 쿼리 빌더: 활성화된 지역만 조회하는 기본 조건 설정
const buildActiveRegionQuery = (qb: SelectQueryBuilder<Region>) => {
  qb.where("r.is_active = :isActive", { isActive: true }); // 폐지되지 않은, 현존하는 지역만 조회
};

// sido(시/도) 조회
router.get("/sidos", async (req, res) => {
  try {
    const regionRepo = AppDataSource.getRepository(Region);
    const qb = regionRepo.createQueryBuilder("r");
    buildActiveRegionQuery(qb);

    const nameCaseExpression = `CASE 
            WHEN r.name IN ('충청북도', '충청남도', '전라북도', '전라남도', '경상북도', '경상남도') 
            THEN CONCAT(SUBSTRING(r.name, 1, 1), SUBSTRING(r.name, 3, 1)) 
            ELSE SUBSTRING(r.name, 1, 2) 
          END`;

    qb.select(["r.code AS code", `${nameCaseExpression} AS name`]);
    qb.andWhere("(CHAR_LENGTH(r.name) - CHAR_LENGTH(REPLACE(r.name, ' ', ''))) = 0");

    const rows = await qb.getRawMany<OfferRegionDto[]>();

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "시/도 지역 데이터를 불러오는 중 오류가 발생했습니다.",
      errorCode: "FETCH_SIDO_REGIONS_ERROR",
    });
  }
});

router.get("/sigungus", async (req: RegionRequest, res) => {
  try {
    const { sidoCode } = req.query;

    // sidoCode 파라미터 검증 (타입 가드)
    if (!sidoCode) {
      return res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "sidoCode 파라미터가 필요합니다.",
      });
    }

    // sidoCode 형식 검증 (숫자로만 구성되어야 함)
    if (!/^\d+$/.test(sidoCode)) {
      return res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "sidoCode는 숫자로만 구성되어야 합니다.",
      });
    }

    const regionRepo = AppDataSource.getRepository(Region);
    const qb = regionRepo.createQueryBuilder("r");
    buildActiveRegionQuery(qb);

    qb.select(["r.code AS code", "SUBSTRING_INDEX(r.name, ' ', -1) AS name"]);
    qb.andWhere("r.code LIKE :sidoCode", {
      sidoCode: `${sidoCode}%`,
    }).andWhere("(CHAR_LENGTH(r.name) - CHAR_LENGTH(REPLACE(r.name, ' ', ''))) = 1");

    const rows = await qb.getRawMany<OfferRegionDto[]>();
    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "시/군/구 지역 데이터를 불러오는 중 오류가 발생했습니다.",
      errorCode: "FETCH_SIGUNGU_REGIONS_ERROR",
      additionalContext: { sidoCode: req.query.sidoCode },
    });
  }
});

export default router;
