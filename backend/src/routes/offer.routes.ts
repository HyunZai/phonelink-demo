// server/src/routes/offer.routes.ts
import { Router } from "express";
import { AppDataSource } from "../db";
import { Offer } from "../typeorm/offers.entity";
import { handleError } from "../utils/errorHandler";
import {
  AddonFormData,
  OfferDetailFormData,
  OfferModelDto,
  OfferRegionDto,
  OfferSearchResult,
  PhoneStorageDto,
} from "shared/types";
import { SORT_ORDER } from "../../../shared/constants";

const router = Router();

router.get("/latest", async (req, res) => {
  try {
    const qb = AppDataSource.getRepository(Offer)
      .createQueryBuilder("o")
      .select([
        "o.id AS id",
        "s.id AS storeId",
        "s.name AS storeName",
        "r.name AS regionName",
        "c.name AS carrierName",
        "CONCAT_WS(' ', pm.name_ko, ps.storage) AS modelName",
        "CASE WHEN o.offer_type = 'MNP' THEN '번호이동' WHEN o.offer_type = 'CHG' THEN '기기변경' ELSE o.offer_type END AS offerType",
        "o.price AS price",
        "pm.image_url AS imageUrl",
        "pm2.id AS manufacturerId",
        "GREATEST(o.created_at, COALESCE(o.updated_at, o.created_at)) AS latestTime",
      ])
      .innerJoin("o.store", "s")
      .innerJoin("s.region", "r")
      .innerJoin("o.device", "pd")
      .innerJoin("pd.model", "pm")
      .innerJoin("pd.storage", "ps")
      .innerJoin("pm.manufacturer", "pm2")
      .innerJoin("o.carrier", "c")
      .where("1=1")
      .andWhere("r.is_active = :isActive", { isActive: true })
      .andWhere("(CHAR_LENGTH(r.name) - CHAR_LENGTH(REPLACE(r.name, ' ', ''))) = 1")
      .andWhere("s.status = :status", { status: "OPEN" })
      .andWhere("o.price IS NOT NULL")
      .andWhere("s.approval_status = :approvalStatus", { approvalStatus: "APPROVED" })
      .orderBy("latestTime", "DESC");

    const allOffers: OfferSearchResult[] = await qb.getRawMany();

    // 모델명으로 그룹바이해서 각각 다른 모델의 데이터만 선택
    const modelGroups = new Map<string, OfferSearchResult[]>();

    allOffers.forEach((offer) => {
      // modelName에서 용량 부분 제거 (뒤에서 첫 번째 공백 기준으로 자르기)
      const fullModelName = offer.modelName;
      const lastSpaceIndex = fullModelName.lastIndexOf(" ");
      const baseModelName = lastSpaceIndex !== -1 ? fullModelName.substring(0, lastSpaceIndex) : fullModelName;

      if (!modelGroups.has(baseModelName)) {
        modelGroups.set(baseModelName, []);
      }
      modelGroups.get(baseModelName)!.push(offer);
    });

    // 각 모델 그룹에서 첫 번째 데이터 1개씩 선택 (최대 4개)
    // 이미 createdAt DESC로 정렬되어 있으므로 첫 번째가 가장 최신 데이터
    const uniqueModelOffers: OfferSearchResult[] = [];
    const manufacturerCounts = new Map<number, number>(); // 제조사별 카운트

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_modelName, offers] of modelGroups) {
      if (uniqueModelOffers.length >= 4) break;

      // 해당 모델의 첫 번째 데이터 선택 (이미 최신순으로 정렬됨)
      const latestOffer = offers[0];

      // 제조사 ID 사용 (쿼리에서 pm2.id를 select했으므로 사용 가능)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manufacturerId = (latestOffer as any).manufacturerId;

      // 특정 제조사(예: ID 1)는 최대 2개만 허용
      if (manufacturerId === 1) {
        const currentCount = manufacturerCounts.get(manufacturerId) || 0;
        if (currentCount >= 2) continue; // 이미 2개면 스킵
        manufacturerCounts.set(manufacturerId, currentCount + 1);
      }

      uniqueModelOffers.push(latestOffer);
    }

    res.status(200).json({
      success: true,
      data: uniqueModelOffers,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "최근 등록 조건을 불러오는 중 오류가 발생했습니다.",
      errorCode: "FETCH_LATEST_OFFERS_ERROR",
    });
  }
});

router.get("/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    const offerRepo = AppDataSource.getRepository(Offer);
    const sql = `
      SELECT 
        o.id AS "offerId", 
        s.id AS "storeId",
        s.name AS "storeName", 
        s.thumbnail_url AS "storeThumbnailUrl",
        CONCAT_WS(' ', s.address, s.address_detail) AS "storeAddress",
        s.contact AS "storeContact",
        s.link_1 AS "storeLink_1",
        s.link_2 AS "storeLink_2",
        CONCAT_WS(' ', pm.name_ko, ps.storage) AS "modelName",
        pm.image_url AS "modelImageUrl",
        pm.release_date AS "modelReleaseDate",
        c.name AS "carrierName",
        o.offer_type AS "offerType",
        o.price AS "price",
        pd.retail_price AS "retailPrice",
        pd.coupang_link AS "coupangLink",
        pd.unlocked_price AS "unlockedPrice",
        rp.monthly_fee AS "monthlyFee"
      FROM offers o
      JOIN stores s ON o.store_id = s.id
      JOIN req_plans rp ON (s.id = rp.store_id AND o.carrier_id = rp.carrier_id)
      JOIN phone_devices pd ON o.device_id = pd.id
      JOIN phone_models pm ON pd.model_id = pm.id
      JOIN phone_storages ps ON pd.storage_id = ps.id 
      JOIN carriers c ON o.carrier_id = c.id 
      WHERE o.id = ?;
    `;

    const result = await offerRepo.query<OfferDetailFormData[]>(sql, [offerId]);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Not Found",
        message: "해당 판매 정보를 찾을 수 없습니다.",
      });
    }

    const offerDetail = result[0];

    res.status(200).json({
      success: true,
      data: offerDetail,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "판매 정보를 불러오던 중 오류가 발생했습니다.",
      errorCode: "FETCH_OFFER_DETAIL_ERROR",
      additionalContext: { offerId: req.params.offerId },
    });
  }
});

router.get("/:offerId/addon-info", async (req, res) => {
  try {
    const { offerId } = req.params;
    const offerRepo = AppDataSource.getRepository(Offer);

    const addons = await offerRepo
      .createQueryBuilder("o")
      .select([
        "a.name AS name",
        "a.carrier_id AS carrierId",
        "a.monthly_fee AS monthlyFee",
        "a.duration_months AS durationMonths",
        "a.penalty_fee AS penaltyFee",
      ])
      .innerJoin("o.store", "s")
      .innerJoin("addons", "a", "a.store_id = s.id AND a.carrier_id = o.carrier_id")
      .where("o.id = :offerId", { offerId })
      .getRawMany<AddonFormData[]>();

    res.status(200).json({
      success: true,
      data: addons,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "부가서비스 정보를 불러오던 중 오류가 발생했습니다.",
      errorCode: "FETCH_ADDON_INFO_ERROR",
      additionalContext: { offerId: req.params.offerId },
    });
  }
});

router.post("/search", async (req, res) => {
  try {
    // page: 현재 페이지 번호, limit: 페이지 당 아이템 수, sortOrder: 정렬 순서
    const { regions, models, carriers, offerTypes, page = 1, limit = 20, sortOrder = SORT_ORDER.DEFAULT } = req.body;

    interface DynamicParams {
      [key: string]: string | string[] | number | number[] | boolean;
    }

    // 지역 조건
    const regionClauses: string[] = [];
    const regionParams: DynamicParams = {};

    if (regions?.length) {
      const sidoCodeClauses: string[] = [];
      const specificCodes: string[] = [];

      regions.forEach((region: OfferRegionDto, index: number) => {
        // code 값의 맨 앞에 '-'이 있으면 시/도 단위 필터링
        if (region.code.startsWith("-")) {
          // 2,3번째 자리의 코드 추출 (예: '-1100000000' -> '11')
          const temp = region.code.substring(1, 3);
          const sidoCode = region.code.substring(1, temp === "36" ? 5 : 3);
          sidoCodeClauses.push(`r.code LIKE :parentCode${index}`);
          regionParams[`parentCode${index}`] = `${sidoCode}%`;
        } else {
          // 일반 지역 코드는 IN 조건에 추가
          specificCodes.push(region.code);
        }
      });

      // 시/도 단위 조건 추가
      if (sidoCodeClauses.length > 0) {
        regionClauses.push(`(${sidoCodeClauses.join(" OR ")})`);
      }

      // 특정 지역 코드 조건 추가
      if (specificCodes.length > 0) {
        regionClauses.push(`r.code IN (:...codes)`);
        regionParams.codes = specificCodes;
      }
    }

    // 모델 조건
    const modelClauses: string[] = [];
    const modelParams: DynamicParams = {};

    (models || []).forEach((item: OfferModelDto, idx: number) => {
      const prefix = `m${idx}`;

      const modelId = Number(item?.modelId);
      const manufacturerId = Number(item?.manufacturerId);
      const storages = Array.isArray(item?.storages) ? item.storages : [];

      // modelId < 0 => 제조사 단위 필터 (전체 선택)
      if (Number.isFinite(modelId) && modelId < 0) {
        if (Number.isFinite(manufacturerId) && manufacturerId > 0) {
          modelClauses.push(`(pm2.id = :${prefix}_manu)`);
          modelParams[`${prefix}_manu`] = manufacturerId;
        }
        return; // 이 항목 처리 끝
      }

      // modelId > 0 => 모델 단위 + 스토리지 규칙
      if (Number.isFinite(modelId) && modelId > 0) {
        const hasNegativeStorage = storages.some((s: PhoneStorageDto) => Number(s?.id) < 0);
        const positiveStorageIds = storages
          .map((s: PhoneStorageDto) => Number(s?.id))
          .filter((id: number) => Number.isFinite(id) && id > 0);

        if (!hasNegativeStorage && positiveStorageIds.length > 0) {
          // 스토리지 조건 적용
          modelClauses.push(`(pd.model_id = :${prefix}_model AND pd.storage_id IN (:...${prefix}_storages))`);
          modelParams[`${prefix}_model`] = modelId;
          modelParams[`${prefix}_storages`] = positiveStorageIds;
        } else {
          // 스토리지 조건 생략
          modelClauses.push(`(pd.model_id = :${prefix}_model)`);
          modelParams[`${prefix}_model`] = modelId;
        }
      }
      // 그 외(0, NaN 등)는 무시
    });

    // 통신사 조건
    let carrierClause = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let carrierParams: any = {};
    if (carriers?.length) {
      const carrierIds = carriers
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((c: any) => Number(c.id))
        .filter((v: number) => Number.isFinite(v));
      if (carrierIds.length) {
        carrierClause = `c.id IN (:...carrierIds)`;
        carrierParams = { carrierIds };
      }
    }

    // 번호이동/기기변경 조건
    let offerTypeClause = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let offerTypeParams: any = {};
    if (offerTypes?.length) {
      offerTypeClause = `o.offer_type IN (:...offerTypes)`;
      offerTypeParams = { offerTypes };
    }

    // QueryBuilder
    const qb = AppDataSource.getRepository(Offer)
      .createQueryBuilder("o")
      .select([
        "o.id AS id",
        "s.id AS storeId",
        "s.name AS storeName",
        "r.name AS regionName",
        "c.name AS carrierName",
        "CONCAT_WS(' ', pm.name_ko, ps.storage) AS modelName",
        "CASE WHEN o.offer_type = 'MNP' THEN '번호이동' WHEN o.offer_type = 'CHG' THEN '기기변경' ELSE o.offer_type END AS offerType",
        "o.price AS price",
        "pm.image_url AS imageUrl",
      ])
      .innerJoin("o.store", "s")
      .innerJoin("s.region", "r")
      .innerJoin("o.device", "pd")
      .innerJoin("pd.model", "pm")
      .innerJoin("pd.storage", "ps")
      .innerJoin("pm.manufacturer", "pm2")
      .innerJoin("o.carrier", "c")
      .where("1=1")
      .andWhere("r.is_active = :isActive", { isActive: true }) // 폐지되지 않은, 현존하는 지역만 조회
      .andWhere("(CHAR_LENGTH(r.name) - CHAR_LENGTH(REPLACE(r.name, ' ', ''))) = 1") // '시/군/구' 코드만 불러오는 조건
      .andWhere("s.status = :status", { status: "OPEN" }) // 폐업하지 않은 매장만 조회
      .andWhere("o.price IS NOT NULL") // 가격이 있는 경우만 조회
      .andWhere("s.approval_status = :approvalStatus", {
        approvalStatus: "APPROVED",
      }); // 승인된 매장만 조회

    if (regionClauses.length) {
      qb.andWhere(`(${regionClauses.join(" OR ")})`, regionParams);
    }
    if (modelClauses.length) {
      qb.andWhere(`(${modelClauses.join(" OR ")})`, modelParams);
    }
    if (carrierClause) {
      qb.andWhere(carrierClause, carrierParams);
    }
    if (offerTypeClause) {
      qb.andWhere(offerTypeClause, offerTypeParams);
    }

    // 정렬 조건 적용
    if (sortOrder === SORT_ORDER.PRICE_ASC) {
      qb.orderBy("o.price", "ASC");
    } else if (sortOrder === SORT_ORDER.PRICE_DESC) {
      qb.orderBy("o.price", "DESC");
    }

    // 페이지네이션을 위한 총 개수 카운트 (주석처리됨, 필요시 활성화)
    // const total = await qb.getCount();

    // 페이지네이션 적용
    // limit + 1개를 가져와서 다음 페이지가 있는지 확인
    const items: OfferSearchResult[] = await qb
      .offset((page - 1) * limit)
      .limit(limit + 1)
      .getRawMany();

    // 다음 페이지 존재 여부 확인
    const hasNextPage = items.length > limit;
    // 실제 반환할 아이템은 limit 개수만큼 슬라이스
    const paginatedItems = items.slice(0, limit);

    res.status(200).json({
      success: true,
      data: {
        offers: paginatedItems,
        hasNextPage,
      },
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "데이터를 조회하는 중 서버에서 오류가 발생했습니다.",
      errorCode: "SEARCH_OFFERS_ERROR",
      additionalContext: {
        regions: req.body.regions,
        models: req.body.models,
        carriers: req.body.carriers,
        offerTypes: req.body.offerTypes,
        page: req.body.page,
        limit: req.body.limit,
        sortOrder: req.body.sortOrder,
      },
    });
  }
});

export default router;
