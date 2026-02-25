import { AuthenticatedRequest, hasRole, isAuthenticated } from "../middlewares/auth.middleware";
import {
  AddonFormData,
  StoreOfferModel,
  StoreOfferPriceFormData,
  OfferDto,
  PhoneDeviceDto,
  ReqPlanDto,
  PendingStoreDto,
  StoreRegisterFormData,
  StoreStaffData,
} from "shared/types";
import { PhoneDevice } from "../typeorm/phoneDevices.entity";
import { Offer } from "../typeorm/offers.entity";
import { Addon } from "../typeorm/addons.entity";
import { Store } from "../typeorm/stores.entity";
import { ReqPlan } from "../typeorm/reqPlans.entity";
import { User } from "../typeorm/users.entity";
import { Seller } from "../typeorm/sellers.entity";
import { UserFavorites } from "../typeorm/userFavorites.entity";
import { AppDataSource } from "../db";
import { Router } from "express";
import { ROLES } from "../../../shared/constants";
import { handleError } from "../utils/errorHandler";

const router = Router();

router.get("/stores", async (req, res) => {
  try {
    const storeRepo = AppDataSource.getRepository(Store);
    const stores = await storeRepo.find({
      where: {
        approvalStatus: "APPROVED",
      },
    });
    res.status(200).json({
      success: true,
      data: stores,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "매장 목록을 불러오는 중 오류가 발생했습니다.",
      errorCode: "FETCH_STORES_ERROR",
    });
  }
});

// 매장명 중복 확인 엔드포인트
router.get("/check-name", isAuthenticated, hasRole([ROLES.SELLER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { inputStoreName } = req.query;

    if (!inputStoreName || typeof inputStoreName !== "string") {
      return res.status(400).json({
        success: false,
        message: "매장명을 입력해주세요.",
        error: "Bad Request",
      });
    }

    const storeRepo = AppDataSource.getRepository(Store);
    const transformedName = inputStoreName.trim().toLowerCase().replace(/\s+/g, "");

    // 대소문자 구분 없이 비교하기 위해 모든 매장을 가져와서 비교
    const allStores = await storeRepo.find();
    const existingStore = allStores.find(
      (store) => store.name.trim().toLowerCase().replace(/\s+/g, "") === transformedName,
    );

    if (existingStore) {
      return res.status(200).json({
        success: true,
        data: {
          isDuplicate: true,
          message: "이미 존재하는 매장명입니다.",
        },
      });
    } else {
      return res.status(200).json({
        success: true,
        data: {
          isDuplicate: false,
          message: "사용 가능한 매장명입니다.",
        },
      });
    }
  } catch (error) {
    handleError(error, req, res, {
      message: "매장명 확인 중 오류가 발생했습니다.",
      errorCode: "CHECK_STORE_NAME_ERROR",
      additionalContext: { inputStoreName: req.query.inputStoreName },
    });
  }
});

// 매장 등록 요청 엔드포인트
router.post("/register", isAuthenticated, hasRole([ROLES.SELLER, ROLES.ADMIN]), async (req, res) => {
  try {
    const {
      name,
      regionCode,
      address,
      addressDetail,
      contact,
      thumbnailUrl,
      link_1,
      link_2,
      ownerName,
      description,
      approvalStatus,
      createdBy,
    } = req.body;

    // 필수 필드 검증
    if (!name || !address || !contact || !regionCode) {
      return res.status(400).json({
        success: false,
        message: "필수 정보(매장명, 주소, 연락처)가 누락되었습니다.",
        error: "Bad Request",
      });
    }

    // 매장명 중복 확인
    const storeRepo = AppDataSource.getRepository(Store);
    const transformedName = name.trim().toLowerCase().replace(/\s+/g, "");
    const allStores = await storeRepo.find();
    const existingStore = allStores.find(
      (store) => store.name.trim().toLowerCase().replace(/\s+/g, "") === transformedName,
    );

    if (existingStore) {
      return res.status(409).json({
        success: false,
        message: "이미 존재하는 매장명입니다.",
        error: "Conflict",
      });
    }

    // 새 매장 생성
    const newStore = storeRepo.create({
      name: name,
      regionCode: regionCode,
      address: address,
      addressDetail: addressDetail || null,
      contact: contact.trim(),
      thumbnailUrl: thumbnailUrl || null,
      link_1: link_1?.trim() || null,
      link_2: link_2?.trim() || null,
      ownerName: ownerName?.trim() || null,
      description: description || null,
      approvalStatus: approvalStatus || "PENDING",
      createdBy: createdBy,
    });

    await storeRepo.save(newStore);

    res.status(201).json({
      success: true,
      message: "매장 등록 요청이 성공적으로 제출되었습니다.",
      data: {
        id: newStore.id,
        name: newStore.name,
        approvalStatus: newStore.approvalStatus,
      },
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "매장 등록 요청 중 오류가 발생했습니다.",
      errorCode: "REGISTER_STORE_ERROR",
    });
  }
});

// 승인 대기 상태인 매장 데이터 조회 엔드포인트
router.get("/pending", isAuthenticated, hasRole([ROLES.ADMIN]), async (req, res) => {
  try {
    const storeRepo = AppDataSource.getRepository(Store);

    // 승인 대기 상태인 매장 데이터 조회
    const pendingStores = await storeRepo
      .createQueryBuilder("s")
      .leftJoin("regions", "r", "s.region_code = r.code")
      .leftJoin("users", "u", "s.created_by = u.id")
      .select([
        "s.id as id",
        "s.name as name",
        "s.contact as contact",
        "s.created_at as createdAt",
        "s.created_by as createdBy",
        "s.region_code as regionCode",
        "r.name as regionName",
        "u.email as userEmail",
      ])
      .where("s.approval_status = :status", { status: "PENDING" })
      .getRawMany<PendingStoreDto>();

    res.status(200).json({
      success: true,
      data: pendingStores,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "승인 대기 매장 목록 조회 중 오류가 발생했습니다.",
      errorCode: "FETCH_PENDING_STORES_ERROR",
    });
  }
});

//특정 매장 시세표 조회
router.get("/:storeId/offers", async (req, res) => {
  try {
    const { storeId } = req.params;
    const offerRepo = AppDataSource.getRepository(Offer);

    const response = await offerRepo
      .createQueryBuilder("o")
      .select([
        "o.id as id",
        "c.id as carrierId",
        "c.name as carrierName",
        "o.offer_type as offerType",
        "pm.id as modelId",
        "pm.name_ko as modelName",
        "ps.id as storageId",
        "ps.storage as storage",
        "o.price as price",
        "pm2.id as manufacturerId",
      ])
      .innerJoin("o.carrier", "c")
      .innerJoin("o.device", "pd")
      .innerJoin("pd.model", "pm")
      .innerJoin("pd.storage", "ps")
      .innerJoin("pm.manufacturer", "pm2")
      .where("o.store_id = :storeId", { storeId: parseInt(storeId) })
      .orderBy("pm2.id", "ASC")
      .addOrderBy("pm.release_date", "ASC")
      .addOrderBy("LENGTH(pm.name_ko)", "ASC")
      .addOrderBy("pm.name_ko", "ASC")
      .addOrderBy("ps.storage", "ASC")
      .addOrderBy("c.id", "ASC")
      .addOrderBy("o.offer_type", "ASC")
      .getRawMany<StoreOfferPriceFormData>();

    // 🔹 계층 구조로 가공
    const formattedData: StoreOfferModel[] = [];

    for (const row of response) {
      // 모델 찾기
      let model = formattedData.find((m) => m.modelId === row.modelId);
      if (!model) {
        model = {
          manufacturerId: row.manufacturerId,
          modelId: row.modelId,
          modelName: row.modelName,
          storages: [],
        };
        formattedData.push(model);
      }

      // 스토리지 찾기
      let storage = model.storages.find((s) => s.storageId === row.storageId);
      if (!storage) {
        storage = {
          storageId: row.storageId,
          storage: row.storage,
          carriers: [],
        };
        model.storages.push(storage);
      }

      // 통신사 찾기
      let carrier = storage.carriers.find((c) => c.carrierId === row.carrierId);
      if (!carrier) {
        carrier = {
          carrierId: row.carrierId,
          carrierName: row.carrierName,
          offerTypes: [],
        };
        storage.carriers.push(carrier);
      }

      // 조건 추가
      carrier.offerTypes.push({
        offerType: row.offerType,
        price: row.price,
      });
    }

    res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "가격 정보 조회 중 오류가 발생했습니다.",
      errorCode: "FETCH_STORE_OFFERS_ERROR",
      additionalContext: { storeId: req.params.storeId },
    });
  }
});

//특정 매장 시세표 저장
router.post(
  "/:storeId/offers",
  isAuthenticated,
  hasRole([ROLES.SELLER, ROLES.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    const { storeId } = req.params;
    const { offers } = req.body;
    const userId = req.user!.id; // ❕인증된 요청이므로 user 객체는 항상 존재

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const offerRepo = queryRunner.manager.getRepository(Offer);
      const deviceRepo = queryRunner.manager.getRepository(PhoneDevice);

      // N+1 문제 해결을 위해 필요한 모든 device 정보를 미리 조회
      const deviceIdentifiers = offers.flatMap((model: StoreOfferModel) =>
        model.storages.map((storage) => ({
          modelId: model.modelId,
          storageId: storage.storageId,
        })),
      );
      const devices = await deviceRepo.find({ where: deviceIdentifiers });
      // 빠른 조회를 위해 Map으로 변환: '모델ID-스토리지ID'를 키로 사용
      const deviceMap = new Map(devices.map((d) => [`${d.modelId}-${d.storageId}`, d] as [string, PhoneDeviceDto]));

      // 클라이언트에서 받은 데이터를 DB에 저장할 최종 형태로 가공
      const newOfferMap = new Map<string, OfferDto>();
      for (const model of offers) {
        for (const storage of model.storages) {
          for (const carrier of storage.carriers) {
            for (const offerType of carrier.offerTypes) {
              const device = deviceMap.get(`${model.modelId}-${storage.storageId}`);
              if (device) {
                // 유니크한 키를 생성하여 Offer를 식별
                const offerKey = `${carrier.carrierId}-${device.id}-${offerType.offerType}`;
                const offerData: OfferDto = {
                  storeId: parseInt(storeId as string),
                  carrierId: carrier.carrierId,
                  deviceId: device.id,
                  offerType: offerType.offerType,
                  price: offerType.price,
                  updatedBy: userId,
                };
                newOfferMap.set(offerKey, offerData);
              }
            }
          }
        }
      }

      // DB에 저장된 기존 Offer 데이터를 조회
      const existingOffers = await offerRepo.findBy({
        storeId: parseInt(storeId as string),
      });
      const existingOfferMap = new Map(
        existingOffers.map((o) => {
          const key = `${o.carrierId}-${o.deviceId}-${o.offerType}`;
          return [key, o];
        }),
      );

      // 추가(Insert), 수정(Update), 삭제(Delete)할 대상을 분류
      const toInsert: OfferDto[] = [];
      const toUpdate: Offer[] = [];
      const toDelete: number[] = []; // id 배열

      // 새로운 데이터를 기준으로 Insert/Update 대상 찾기
      for (const [key, newOffer] of newOfferMap.entries()) {
        const existingOffer = existingOfferMap.get(key);

        if (existingOffer) {
          // 기존에 데이터가 있으면
          // 가격이 다를 경우에만 업데이트 목록에 추가
          if (existingOffer.price !== newOffer.price) {
            toUpdate.push({ ...existingOffer, price: newOffer.price ?? null });
          }
          // 비교가 끝난 항목은 기존 맵에서 제거
          existingOfferMap.delete(key);
        } else {
          // 기존에 데이터가 없으면
          toInsert.push(newOffer); // 추가 목록에 추가
        }
      }

      // 이제 existingOfferMap에 남아있는 데이터는 삭제 대상입니다.
      for (const offerToDelete of existingOfferMap.values()) {
        toDelete.push(offerToDelete.id);
      }

      // 5. 분류된 데이터를 바탕으로 DB 작업을 실행합니다.
      if (toDelete.length > 0) {
        await offerRepo.delete(toDelete);
      }
      if (toUpdate.length > 0) {
        await offerRepo.save(toUpdate);
      }
      if (toInsert.length > 0) {
        await offerRepo.insert(toInsert);
      }

      // 6. 모든 작업이 성공했으므로 트랜잭션을 커밋합니다.
      await queryRunner.commitTransaction();

      res.status(200).json({
        success: true,
        data: {
          inserted: toInsert.length,
          updated: toUpdate.length,
          deleted: toDelete.length,
        },
      });
    } catch (error) {
      // 에러 발생 시 모든 변경사항을 롤백합니다.
      await queryRunner.rollbackTransaction();
      handleError(error, req, res, {
        message: "가격 정보 저장 중 오류가 발생했습니다.",
        errorCode: "SAVE_STORE_OFFERS_ERROR",
        additionalContext: { storeId: req.params.storeId },
      });
    } finally {
      // 사용한 QueryRunner를 반드시 해제해줘야 합니다.
      await queryRunner.release();
    }
  },
);

//특정 매장 부가서비스 조회
router.get("/:storeId/addons", async (req, res) => {
  try {
    const { storeId } = req.params;
    const addonRepo = AppDataSource.getRepository(Addon);
    const result = await addonRepo.find({
      where: { storeId: parseInt(storeId) },
    });

    const parsedResult: AddonFormData[] = result.map((addon) => ({
      ...addon,
      carrierId: addon.carrierId,
      monthlyFee: addon.monthlyFee,
      durationMonths: addon.durationMonths,
      penaltyFee: addon.penaltyFee,
    }));

    res.status(200).json({
      success: true,
      data: parsedResult,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "부가서비스 조회 중 오류가 발생했습니다.",
      errorCode: "FETCH_STORE_ADDONS_ERROR",
      additionalContext: { storeId: req.params.storeId },
    });
  }
});

//특정 매장 기본 정보 조회
router.get("/:storeId/detail", async (req, res) => {
  try {
    const { storeId } = req.params;
    const storeRepo = AppDataSource.getRepository(Store);
    const store = await storeRepo.findOne({
      where: { id: parseInt(storeId) },
      select: [
        "name",
        "description",
        "regionCode",
        "address",
        "addressDetail",
        "contact",
        "thumbnailUrl",
        "link_1",
        "link_2",
        "ownerName",
        "approvalStatus",
        "createdBy",
      ],
    });

    if (!store) {
      res.status(404).json({
        success: false,
        message: "매장 상세정보 조회 중 오류가 발생했습니다.",
        error: "Not Found",
      });
    } else {
      const responseData: StoreRegisterFormData = store;

      res.status(200).json({
        success: true,
        data: responseData,
      });
    }
  } catch (error) {
    handleError(error, req, res, {
      message: "매장 상세정보 조회 중 오류가 발생했습니다.",
      errorCode: "FETCH_STORE_DETAIL_ERROR",
      additionalContext: { storeId: req.params.storeId },
    });
  }
});

router.post(
  "/:storeId/edit-info",
  isAuthenticated,
  hasRole([ROLES.SELLER, ROLES.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { storeId } = req.params;
      const { editedStore } = req.body;

      // storeId 유효성 검사
      const storeIdNumber = parseInt(storeId as string);
      if (isNaN(storeIdNumber)) {
        return res.status(400).json({
          success: false,
          message: "유효하지 않은 매장 ID입니다.",
        });
      }

      const storeRepo = AppDataSource.getRepository(Store);

      // 매장 존재 여부 확인
      const store = await storeRepo.findOne({ where: { id: storeIdNumber } });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: "매장을 찾을 수 없습니다.",
        });
      }

      // 권한 확인 (ADMIN이 아닌 경우, 해당 매장의 직원인지 확인)
      if (req.user?.role !== ROLES.ADMIN) {
        const sellerRepo = AppDataSource.getRepository(Seller);
        const seller = await sellerRepo.findOne({
          where: {
            userId: req.user?.id,
            storeId: storeIdNumber,
            status: "ACTIVE",
          },
        });

        if (!seller) {
          return res.status(403).json({
            success: false,
            message: "해당 매장의 정보를 수정할 권한이 없습니다.",
          });
        }
      }

      // 매장 기본 정보 업데이트
      store.name = editedStore.name || store.name;
      store.description = editedStore.description !== undefined ? editedStore.description : store.description;
      store.regionCode = editedStore.regionCode || store.regionCode;
      store.address = editedStore.address || store.address;
      store.addressDetail = editedStore.addressDetail || store.addressDetail;
      store.contact = editedStore.contact || store.contact;
      store.link_1 = editedStore.link_1 !== undefined ? editedStore.link_1 : store.link_1;
      store.link_2 = editedStore.link_2 !== undefined ? editedStore.link_2 : store.link_2;
      store.thumbnailUrl = editedStore.thumbnailUrl !== undefined ? editedStore.thumbnailUrl : store.thumbnailUrl;
      if (req.user?.id) {
        store.updatedBy = req.user.id;
      }

      await storeRepo.save(store);

      res.status(200).json({
        success: true,
        message: "매장 정보가 성공적으로 수정되었습니다.",
        data: store,
      });
    } catch (error) {
      handleError(error, req, res, {
        message: "매장 기본 정보 저장 중 오류가 발생했습니다.",
        errorCode: "UPDATE_STORE_INFO_ERROR",
        additionalContext: { storeId: req.params.storeId },
      });
    }
  },
);

router.post("/:storeId/addon-save", isAuthenticated, hasRole([ROLES.SELLER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { storeId } = req.params;
    const { addons } = req.body;

    // 트랜잭션을 사용하여 데이터 무결성을 보장
    const result = await AppDataSource.transaction(async (transactionalEntityManager) => {
      const storeIdNumber = parseInt(storeId as string);

      // 기존 데이터 삭제
      await transactionalEntityManager.delete(Addon, {
        storeId: storeIdNumber,
      });

      if (addons.length === 0) {
        return []; // 저장할 것이 없으므로 빈 배열 반환
      }

      // 새로운 데이터를 저장할 객체 배열 생성
      const newAddons = addons.map((addon: AddonFormData) => ({
        storeId: storeIdNumber,
        carrierId: addon.carrierId,
        name: addon.name,
        monthlyFee: addon.monthlyFee,
        durationMonths: addon.durationMonths,
        penaltyFee: addon.penaltyFee,
      }));

      // 새로운 데이터 저장
      const savedAddons = await transactionalEntityManager.save(Addon, newAddons);

      return savedAddons;
    });

    res.status(200).json({
      success: true,
      message: "부가서비스가 성공적으로 저장되었습니다.",
      data: result,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "부가서비스 저장 중 오류가 발생했습니다.",
      errorCode: "SAVE_STORE_ADDONS_ERROR",
      additionalContext: { storeId: req.params.storeId },
    });
  }
});

router.get("/:storeId/req-plans", isAuthenticated, async (req, res) => {
  try {
    const { storeId } = req.params;
    const reqPlanRepo = AppDataSource.getRepository(ReqPlan);

    const plans = await reqPlanRepo.findBy({ storeId: parseInt(storeId as string) });

    res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "요금제 정보 조회 중 오류가 발생했습니다.",
      errorCode: "FETCH_REQ_PLANS_ERROR",
      additionalContext: { storeId: req.params.storeId },
    });
  }
});

router.post("/:storeId/req-plans", isAuthenticated, hasRole(["SELLER"]), async (req, res) => {
  try {
    const storeIdString: string = req.params.storeId as string;
    const plans: ReqPlanDto[] = req.body;

    const result = await AppDataSource.transaction(async (transactionEntityManager) => {
      const storeId: number = parseInt(storeIdString);

      // 1. 기존 데이터 삭제
      await transactionEntityManager.delete(ReqPlan, { storeId: storeId });

      if (plans.length === 0) {
        return [];
      }

      // 2. 새 데이터 추가
      const newReqPlans = plans.map((plan: ReqPlanDto) => ({
        storeId: storeId,
        name: plan.name,
        carrierId: plan.carrierId,
        monthlyFee: plan.monthlyFee || 0,
        duration: plan.duration || 0,
      }));
      const savedReqPlans = await transactionEntityManager.save(ReqPlan, newReqPlans);

      return savedReqPlans;
    });

    res.status(200).json({
      success: true,
      message: "요금제가 성공적으로 저장되었습니다.",
      data: result,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "요금제 저장 중 오류가 발생했습니다.",
      errorCode: "SAVE_REQ_PLANS_ERROR",
      additionalContext: { storeId: req.params.storeId },
    });
  }
});

// 즐겨찾기 상태 조회 엔드포인트
router.get("/favorite", isAuthenticated, async (req, res) => {
  try {
    const { userId, storeId } = req.query;

    if (!userId || !storeId) {
      return res.status(400).json({
        success: false,
        message: "사용자 ID와 매장 ID가 필요합니다.",
        error: "Bad Request",
      });
    }

    const favoriteRepo = AppDataSource.getRepository(UserFavorites);
    const favorite = await favoriteRepo.findOne({
      where: {
        userId: parseInt(userId as string),
        storeId: parseInt(storeId as string),
      },
    });

    const isFavorite = !!favorite;

    res.status(200).json({
      success: true,
      data: isFavorite,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "즐겨찾기 상태 조회 중 오류가 발생했습니다.",
      errorCode: "FETCH_FAVORITE_STATUS_ERROR",
      additionalContext: { userId: req.query.userId, storeId: req.query.storeId },
    });
  }
});

// 즐겨찾기 토글 엔드포인트
router.post("/favorite", isAuthenticated, async (req, res) => {
  try {
    const { userId, storeId } = req.body;

    if (!userId || !storeId) {
      return res.status(400).json({
        success: false,
        message: "사용자 ID와 매장 ID가 필요합니다.",
        error: "Bad Request",
      });
    }

    const favoriteRepo = AppDataSource.getRepository(UserFavorites);

    // 기존 즐겨찾기 확인
    const existingFavorite = await favoriteRepo.findOne({
      where: {
        userId: parseInt(userId),
        storeId: parseInt(storeId),
      },
    });

    let isFavorite: boolean;

    if (existingFavorite) {
      // 즐겨찾기가 있으면 삭제
      await favoriteRepo.remove(existingFavorite);
      isFavorite = false;
    } else {
      // 즐겨찾기가 없으면 추가
      const newFavorite = favoriteRepo.create({
        userId: parseInt(userId),
        storeId: parseInt(storeId),
      });
      await favoriteRepo.save(newFavorite);
      isFavorite = true;
    }

    res.status(200).json({
      success: true,
      data: isFavorite,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "즐겨찾기 처리 중 오류가 발생했습니다.",
      errorCode: "TOGGLE_FAVORITE_ERROR",
      additionalContext: { userId: req.body.userId, storeId: req.body.storeId },
    });
  }
});

router.get("/:storeId/staffs", isAuthenticated, hasRole([ROLES.SELLER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { storeId } = req.params;

    const staffs = await AppDataSource.createQueryBuilder()
      .select([
        "u.id as userId",
        "u.email as email",
        "u.name as name",
        "u.nickname as nickname",
        "u.profile_image_url as profileImageUrl",
        "u.phone_number as phoneNumber",
        "u.status as systemStatus",
        "s.status as storeStatus",
      ])
      .from(User, "u")
      .innerJoin("sellers", "s", "u.id = s.user_id")
      .where("s.store_id = :storeId", { storeId: parseInt(storeId as string) })
      .getRawMany<StoreStaffData>();

    res.status(200).json({
      success: true,
      data: staffs,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "직원 조회 중 오류가 발생했습니다.",
      errorCode: "FETCH_STAFFS_ERROR",
      additionalContext: { storeId: req.params.storeId },
    });
  }
});

router.post("/update-staff-status", isAuthenticated, hasRole([ROLES.SELLER, ROLES.ADMIN]), async (req, res) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const { storeId, userId, newStatus } = req.body;
    const sellerRepo = queryRunner.manager.getRepository(Seller);
    const userRepo = queryRunner.manager.getRepository(User);

    const seller = await sellerRepo.findOne({ where: { storeId: parseInt(storeId), userId: parseInt(userId) } });
    if (!seller) {
      await queryRunner.rollbackTransaction();
      return res.status(404).json({
        success: false,
        message: "직원 조회 중 오류가 발생했습니다.",
      });
    }

    const oldStatus = seller.status;
    seller.status = newStatus as "ACTIVE" | "INACTIVE" | "PENDING" | "REJECTED";
    await sellerRepo.save(seller);

    // seller status 변경 시 users 테이블의 role도 변경
    const user = await userRepo.findOne({ where: { id: parseInt(userId) } });
    if (user) {
      // ACTIVE → INACTIVE: 판매자 권한 해제
      if (oldStatus === "ACTIVE" && newStatus === "INACTIVE") {
        user.role = ROLES.USER;
        await userRepo.save(user);
      }
      // PENDING → REJECTED: 판매자 승인 거절
      else if (oldStatus === "PENDING" && newStatus === "REJECTED") {
        user.role = ROLES.USER;
        await userRepo.save(user);
      }
      // 계정 정보 수정 모달에서 승인 전(PENDING) 상태에서 다시 '일반 사용자로' 변경
      else if (oldStatus === "PENDING" && newStatus === "INACTIVE") {
        user.role = ROLES.USER;
        await userRepo.save(user);
        await sellerRepo.remove(seller);
      }
    }

    await queryRunner.commitTransaction();

    res.status(200).json({
      success: true,
      message: "직원 상태 업데이트 완료",
    });
  } catch (error) {
    await queryRunner.rollbackTransaction();
    handleError(error, req, res, {
      message: "직원 상태 업데이트 중 오류가 발생했습니다.",
      errorCode: "UPDATE_STAFF_STATUS_ERROR",
      additionalContext: { storeId: req.body.storeId, userId: req.body.userId, newStatus: req.body.newStatus },
    });
  } finally {
    await queryRunner.release();
  }
});

// 사용 가능한 모델 목록 조회 (아직 등록되지 않은 모델들)
router.get("/:storeId/available-models", isAuthenticated, hasRole([ROLES.SELLER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { storeId } = req.params;

    const query = `
      SELECT
          pm.id,
          pm.name_ko,
          pm.manufacturer_id
      FROM
          phone_models pm
      JOIN (
          SELECT model_id, COUNT(*) AS total_storage_count
          FROM phone_devices
          GROUP BY model_id
      ) AS model_storage_totals ON pm.id = model_storage_totals.model_id
      LEFT JOIN (
          SELECT pd.model_id, COUNT(DISTINCT pd.storage_id) AS offered_storage_count
          FROM offers o
          JOIN phone_devices pd ON o.device_id = pd.id
          WHERE o.store_id = ?
          GROUP BY pd.model_id
      ) AS store_offer_counts ON pm.id = store_offer_counts.model_id
      WHERE
          model_storage_totals.total_storage_count > COALESCE(store_offer_counts.offered_storage_count, 0)
      ORDER BY
          pm.manufacturer_id,
          pm.release_date DESC,
          pm.name_ko;
    `;

    const result = await AppDataSource.query(query, [parseInt(storeId as string)]);

    // pm.id와 pm.manufacturer_id를 number로 파싱
    const parsedResult = result.map((item: { id: string; name_ko: string; manufacturer_id: string }) => ({
      ...item,
      id: parseInt(item.id),
      manufacturer_id: parseInt(item.manufacturer_id),
    }));

    res.status(200).json({
      success: true,
      data: parsedResult,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "사용 가능한 모델 목록을 불러오는 중 오류가 발생했습니다.",
      errorCode: "FETCH_AVAILABLE_MODELS_ERROR",
      additionalContext: { storeId: req.params.storeId },
    });
  }
});

// 선택된 모델의 사용 가능한 용량 목록 조회
router.get("/:storeId/available-storages", isAuthenticated, hasRole([ROLES.SELLER, ROLES.ADMIN]), async (req, res) => {
  try {
    const { storeId } = req.params;
    const { modelId } = req.query;

    if (!modelId) {
      return res.status(400).json({
        success: false,
        message: "모델 ID가 필요합니다.",
      });
    }

    const query = `
      SELECT
          ps.id,
          ps.storage
      FROM
          phone_storages ps
      JOIN
          phone_devices pd ON ps.id = pd.storage_id
      WHERE
          pd.model_id = ?
          AND NOT EXISTS (
              SELECT 1
              FROM offers o
              WHERE
                  o.store_id = ?
                  AND o.device_id = pd.id
          )
      ORDER BY
          CASE
              WHEN ps.storage LIKE '%TB' THEN CAST(REPLACE(ps.storage, 'TB', '') AS UNSIGNED) * 1024
              WHEN ps.storage LIKE '%GB' THEN CAST(REPLACE(ps.storage, 'GB', '') AS UNSIGNED)
              ELSE 0
          END ASC;
    `;

    const result = await AppDataSource.query(query, [parseInt(modelId as string), parseInt(storeId as string)]);

    // ps.id를 number로 파싱
    const parsedResult = result.map((item: { id: string; storage: string }) => ({
      ...item,
      id: parseInt(item.id),
    }));

    res.status(200).json({
      success: true,
      data: parsedResult,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "사용 가능한 용량 목록을 불러오는 중 오류가 발생했습니다.",
      errorCode: "FETCH_AVAILABLE_STORAGES_ERROR",
      additionalContext: { storeId: req.params.storeId, modelId: req.query.modelId },
    });
  }
});

export default router;
