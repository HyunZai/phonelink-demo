import { Router } from "express";
import axios from "axios";
import { AppDataSource } from "../db";
import { Region } from "../typeorm/regions.entity";
import { Store } from "../typeorm/stores.entity";
import { Seller } from "../typeorm/sellers.entity";
import { isAuthenticated, hasRole, AuthenticatedRequest } from "../middlewares/auth.middleware";
import { ROLES, USER_STATUSES } from "../../../shared/constants";
import { handleError } from "../utils/errorHandler";
import { PhoneModel } from "../typeorm/phoneModels.entity";
import {
  RegionDto,
  PhoneModelGridData,
  PhoneDetailFormData,
  PhoneManufacturerDto,
  CarrierDto,
  PhoneStorageDto,
  UserSimpleDto,
  ReportDetailDto,
  ReportListDto,
  ReportListResponse,
} from "../../../shared/types";
import { UserDetailDto } from "../../../shared/user.types";
import { PhoneStorage } from "../typeorm/phoneStorage.entity";
import { PhoneDevice } from "../typeorm/phoneDevices.entity";
import { PhoneManufacturer } from "../typeorm/phoneManufacturers.entity";
import { Carrier } from "../typeorm/carriers.entity";
import { User } from "../typeorm/users.entity";
import { UserSuspension } from "../typeorm/userSuspensions.entity";
import { Report } from "../typeorm/reports.entity";
import { IsNull } from "typeorm";
import { REPORT_STATUSES } from "../../../shared/constants";

const router = Router();

// 토큰 확인 & 권한 인증 미들웨어 일괄 적용
router.use(isAuthenticated, hasRole([ROLES.ADMIN]));

// #region Store Confirmation
router.post("/store-confirm", async (req, res) => {
  const { storeId, approvalStatus, sellerId } = req.body;
  try {
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      const storeRepo = transactionalEntityManager.getRepository(Store);
      const sellerRepo = transactionalEntityManager.getRepository(Seller);

      const store = await storeRepo.findOne({ where: { id: storeId } });

      if (!store) {
        throw new Error("해당 매장을 찾을 수 없습니다.");
      }

      // 거부가 아닌 승인일 경우, Seller에 새로운 데이터 추가
      if (approvalStatus === "APPROVED") {
        const newSeller = sellerRepo.create({
          userId: sellerId,
          storeId: storeId,
          status: "ACTIVE",
        });
        await sellerRepo.save(newSeller);
      }

      store.approvalStatus = approvalStatus;
      await storeRepo.save(store);
    });

    // 3. 트랜잭션 성공 후 최종 응답 전송
    res.status(200).json({
      success: true,
      message: approvalStatus === "APPROVED" ? "매장 승인 처리가 완료되었습니다." : "매장 거부 처리가 완료되었습니다.",
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "매장 승인 처리 중 오류가 발생했습니다.",
      errorCode: "STORE_CONFIRM_ERROR",
      additionalContext: { storeId: req.body.storeId, approvalStatus: req.body.approvalStatus },
    });
  }
});
// #endregion

// #region Phone Models
router.get("/phone-models", async (req, res) => {
  try {
    const phoneModelRepo = AppDataSource.getRepository(PhoneModel);
    const rows = await phoneModelRepo.find({
      select: ["id", "name_ko", "imageUrl"],
    });

    const result: PhoneModelGridData[] = rows.map((row) => ({
      id: row.id,
      name_ko: row.name_ko,
      imageUrl: row.imageUrl,
    }));

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "핸드폰 모델 정보를 불러오는 중 오류가 발생했습니다.",
      errorCode: "FETCH_PHONE_MODELS_ERROR",
    });
  }
});

router.get("/phone-detail/:id", async (req, res) => {
  try {
    const modelId = parseInt(req.params.id);
    if (isNaN(modelId)) {
      return res.status(400).json({ message: "유효하지 않은 모델 ID입니다." });
    }

    const modelRepo = AppDataSource.getRepository(PhoneModel);
    const model = await modelRepo.findOne({
      where: { id: modelId },
      relations: ["manufacturer", "devices", "devices.storage"],
    });

    if (!model) {
      return res.status(404).json({ message: "해당 핸드폰 모델 정보를 찾을 수 없습니다." });
    }

    const responseData: PhoneDetailFormData = {
      modelId: model.id,
      manufacturerId: model.manufacturer.id,
      manufacturerName: model.manufacturer.name_ko,
      modelName_ko: model.name_ko,
      modelName_en: model.name_en,
      imageUrl: model.imageUrl,
      releaseDate: model.releaseDate,
      storages: model.devices.map((device) => ({
        id: device.storage.id,
        storage: device.storage.storage,
        devices: [
          {
            retailPrice: device.retailPrice,
            unlockedPrice: device.unlockedPrice,
            coupangLink: device.coupangLink,
          },
        ],
      })),
    };

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "핸드폰 모델 상세 정보를 불러오는 중 오류가 발생했습니다.",
      errorCode: "FETCH_PHONE_MODEL_DETAIL_ERROR",
      additionalContext: { modelId: req.params.id },
    });
  }
});

router.post("/phone-detail/:id", async (req, res) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const idParam = req.params.id;
    const modelId = idParam === "null" || isNaN(parseInt(idParam, 10)) ? null : parseInt(idParam, 10);
    const data: PhoneDetailFormData = req.body;

    // 1. 필수 정보 유효성 검사
    if (!data.modelName_ko || !data.modelName_en || !data.imageUrl || !data.releaseDate) {
      return res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "필수 정보가 누락되었습니다.",
      });
    }

    const modelRepo = queryRunner.manager.getRepository(PhoneModel);
    const deviceRepo = queryRunner.manager.getRepository(PhoneDevice);
    const existingModel = modelId ? await modelRepo.findOne({ where: { id: modelId } }) : null;

    if (existingModel) {
      // --- UPDATE LOGIC ---
      // 3-A. 기존 모델 정보가 변경되었는지 확인하고 업데이트
      const modelNeedsUpdate =
        existingModel.manufacturerId !== data.manufacturerId ||
        existingModel.name_ko !== data.modelName_ko ||
        existingModel.name_en !== data.modelName_en ||
        existingModel.imageUrl !== data.imageUrl ||
        existingModel.releaseDate !== data.releaseDate;

      if (modelNeedsUpdate) {
        existingModel.manufacturerId = data.manufacturerId;
        existingModel.name_ko = data.modelName_ko;
        existingModel.name_en = data.modelName_en;
        existingModel.imageUrl = data.imageUrl;
        existingModel.releaseDate = data.releaseDate;
        await modelRepo.save(existingModel);
      }

      // 3-B. PhoneDevice 동기화 (추가/수정/삭제)
      const existingDevices = await deviceRepo.find({
        where: { modelId: existingModel.id },
      });
      const existingDevicesMap = new Map(existingDevices.map((d) => [d.storageId, d]));
      const incomingStoragesMap = new Map(data.storages.map((s) => [s.id, s]));

      const devicesToAdd = [];
      const devicesToUpdate = [];
      const devicesToDelete = [];

      // 삭제할 디바이스 찾기 (DB에는 있지만, 요청 데이터에는 없는 경우)
      for (const existingDevice of existingDevices) {
        if (!incomingStoragesMap.has(existingDevice.storageId)) {
          devicesToDelete.push(existingDevice);
        }
      }

      // 추가 또는 수정할 디바이스 찾기
      for (const incomingStorage of data.storages) {
        const existingDevice = existingDevicesMap.get(incomingStorage.id);

        if (existingDevice) {
          // 수정할 디바이스
          const deviceNeedsUpdate =
            existingDevice.retailPrice !== incomingStorage.devices[0].retailPrice ||
            existingDevice.unlockedPrice !== incomingStorage.devices[0].unlockedPrice ||
            existingDevice.coupangLink !== incomingStorage.devices[0].coupangLink;

          if (deviceNeedsUpdate) {
            existingDevice.retailPrice = incomingStorage.devices[0].retailPrice;
            existingDevice.unlockedPrice = incomingStorage.devices[0].unlockedPrice;
            existingDevice.coupangLink = incomingStorage.devices[0].coupangLink;
            devicesToUpdate.push(existingDevice);
          }
        } else {
          // 추가할 디바이스
          const newDevice = new PhoneDevice();
          newDevice.modelId = existingModel.id;
          newDevice.storageId = incomingStorage.id;
          newDevice.retailPrice = incomingStorage.devices[0].retailPrice;
          newDevice.unlockedPrice = incomingStorage.devices[0].unlockedPrice;
          newDevice.coupangLink = incomingStorage.devices[0].coupangLink;
          devicesToAdd.push(newDevice);
        }
      }

      // DB에 변경사항 적용
      if (devicesToDelete.length > 0) await deviceRepo.remove(devicesToDelete);
      if (devicesToUpdate.length > 0) await deviceRepo.save(devicesToUpdate);
      if (devicesToAdd.length > 0) await deviceRepo.save(devicesToAdd);

      await queryRunner.commitTransaction();
      return res.status(200).json({
        success: true,
        message: "핸드폰 모델 정보가 성공적으로 수정되었습니다.",
      });
    } else {
      // 4. 새 모델 생성
      const newModel = new PhoneModel();
      newModel.manufacturerId = data.manufacturerId;
      newModel.name_ko = data.modelName_ko;
      newModel.name_en = data.modelName_en;
      newModel.imageUrl = data.imageUrl;
      newModel.releaseDate = data.releaseDate;
      const savedModel = await modelRepo.save(newModel);

      const devicesToSave = data.storages.map((storage) => {
        const deviceData = new PhoneDevice();
        deviceData.storageId = storage.id;
        deviceData.modelId = savedModel.id;
        deviceData.retailPrice = storage.devices[0].retailPrice;
        deviceData.unlockedPrice = storage.devices[0].unlockedPrice;
        deviceData.coupangLink = storage.devices[0].coupangLink;
        return deviceData;
      });

      if (devicesToSave.length > 0) {
        await deviceRepo.save(devicesToSave);
      }

      await queryRunner.commitTransaction();
      return res.status(201).json({
        success: true,
        message: "핸드폰 모델이 성공적으로 생성되었습니다.",
      });
    }
  } catch (error) {
    await queryRunner.rollbackTransaction();
    handleError(error, req, res, {
      message: "요청 처리 중 오류가 발생했습니다.",
      errorCode: "PROCESS_PHONE_MODEL_DETAIL_ERROR",
      additionalContext: { modelId: req.params.id },
    });
  } finally {
    await queryRunner.release();
  }
});
// #endregion

// #region Storages
router.get("/storages", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(PhoneStorage);
    const data = await repo.find({ order: { id: "ASC" } });
    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "용량 정보 조회 중 오류가 발생했습니다.",
      errorCode: "FETCH_STORAGES_ERROR",
    });
  }
});

router.get("/storage/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const repo = AppDataSource.getRepository(PhoneStorage);
    const data = await repo.findOneBy({ id });
    if (!data) return res.status(404).json({ message: "Not Found" });
    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "용량 정보 조회 중 오류가 발생했습니다.",
      errorCode: "FETCH_STORAGE_ERROR",
      additionalContext: { storageId: req.params.id },
    });
  }
});

router.post("/storage", async (req, res) => {
  try {
    const storage: PhoneStorageDto = req.body;
    const repo = AppDataSource.getRepository(PhoneStorage);

    let result;
    if (storage.id) {
      //id가 존재하면 수정
      const id = storage.id;
      const dataToUpdate = await repo.findOneBy({ id });
      if (!dataToUpdate) {
        return res.status(404).json({
          success: false,
          message: "Not Found",
        });
      }
      dataToUpdate.storage = storage.storage;
      result = await repo.save(dataToUpdate);
    } else {
      //id가 존재하지 않으면 생성
      result = await repo.save(storage);
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "용량 정보 생성 중 오류가 발생했습니다.",
      errorCode: "CREATE_STORAGE_ERROR",
    });
  }
});
// #endregion

// #region Manufacturers
router.get("/manufacturers", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(PhoneManufacturer);
    const data = await repo.find({ order: { id: "ASC" } });
    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "제조사 정보 조회 중 오류가 발생했습니다.",
      errorCode: "FETCH_MANUFACTURERS_ERROR",
    });
  }
});

router.get("/manufacturer/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const repo = AppDataSource.getRepository(PhoneManufacturer);
    const data = await repo.findOneBy({ id });
    if (!data) return res.status(404).json({ message: "Not Found" });
    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "제조사 정보 조회 중 오류가 발생했습니다.",
      errorCode: "FETCH_MANUFACTURER_ERROR",
      additionalContext: { manufacturerId: req.params.id },
    });
  }
});

router.post("/manufacturer", async (req, res) => {
  try {
    const manufacturer: PhoneManufacturerDto = req.body;
    const repo = AppDataSource.getRepository(PhoneManufacturer);
    let result;
    if (manufacturer.id) {
      const id = manufacturer.id;
      const dataToUpdate = await repo.findOneBy({ id });
      if (!dataToUpdate) {
        return res.status(404).json({
          success: false,
          message: "Not Found",
        });
      }

      dataToUpdate.name_ko = manufacturer.name_ko;
      dataToUpdate.name_en = manufacturer.name_en;
      result = await repo.save(dataToUpdate);
    } else {
      const newData = repo.create(manufacturer);
      result = await repo.save(newData);
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "제조사 정보 갱신 중 오류가 발생했습니다.",
      errorCode: "CREATE_MANUFACTURER_ERROR",
    });
  }
});
// #endregion

// #region Carriers
router.get("/carriers", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Carrier);
    const data = await repo.find({ order: { id: "ASC" } });
    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "통신사 정보 조회 중 오류가 발생했습니다.",
      errorCode: "FETCH_CARRIERS_ERROR",
    });
  }
});

router.get("/carrier/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const repo = AppDataSource.getRepository(Carrier);
    const data = await repo.findOneBy({ id });
    if (!data) return res.status(404).json({ message: "Not Found" });
    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "통신사 정보 조회 중 오류가 발생했습니다.",
      errorCode: "FETCH_CARRIER_ERROR",
      additionalContext: { carrierId: req.params.id },
    });
  }
});

router.post("/carrier", async (req, res) => {
  try {
    const carrier: CarrierDto = req.body;
    const repo = AppDataSource.getRepository(Carrier);

    let result;
    if (carrier.id) {
      const id = carrier.id;
      const dataToUpdate = await repo.findOneBy({ id });
      if (!dataToUpdate) {
        return res.status(404).json({
          success: false,
          message: "Not Found",
        });
      }

      dataToUpdate.name = carrier.name;
      dataToUpdate.imageUrl = carrier.imageUrl || "";
      result = await repo.save(dataToUpdate);
    } else {
      const newData = repo.create(carrier);
      result = await repo.save(newData);
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "통신사 정보 갱신 중 오류가 발생했습니다.",
      errorCode: "CREATE_CARRIER_ERROR",
    });
  }
});

// #endregion

router.get("/users", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(User);
    // withDeleted() 옵션으로 탈퇴한 회원도 포함하여 조회
    const data = await repo.find({
      select: ["id", "profileImageUrl", "nickname", "role", "status"],
      withDeleted: true, // deletedAt이 NULL이 아닌 레코드도 포함
    });

    const result: UserSimpleDto[] = data.map((user) => ({
      id: user.id,
      profileImageUrl: user.profileImageUrl,
      nickname: user.nickname,
      role: user.role,
      status: user.status,
    }));

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "회원 정보 조회 중 오류가 발생했습니다.",
      errorCode: "FETCH_USERS_ERROR",
    });
  }
});

// 사용자 상세 정보 조회 API
router.get("/user-detail/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "유효하지 않은 사용자 ID입니다.",
      });
    }

    // 복잡한 조인 쿼리를 통해 사용자 상세 정보를 한 번에 조회
    // 탈퇴한 사용자도 포함하여 조회 (withDeleted: true)
    // SELLER의 경우 status에 관계없이 매장 정보를 표시하되, ACTIVE 상태를 우선으로 함
    const query = `
      SELECT 
        u.id as id,
        u.profile_image_url as profileImageUrl,
        u.nickname as nickname,
        u.name as name,
        u.email as email,
        u.phone_number as phoneNumber,
        u.role as role,
        u.status as status,
        u.last_login_at as lastLoginAt,
        u.deleted_at as deletedAt,
        u.created_at as createdAt,
        st.id as storeId,
        st.thumbnail_url as storeThumbnailUrl,
        st.name as storeName,
        s.status as sellerStatus,
        sa_grouped.ssoProvider,
        us.reason as reason,
        us.suspended_until as suspendedUntil,
        us.suspended_by as suspendedById,
        us.created_at as suspendedAt,
        us.unsuspended_at as unsuspendedAt
      FROM users u 
      LEFT JOIN (
          SELECT 
              s1.user_id,
              s1.store_id,
              s1.status,
              s1.created_at,
              ROW_NUMBER() OVER (
                  PARTITION BY s1.user_id 
                  ORDER BY 
                      CASE s1.status 
                          WHEN 'ACTIVE' THEN 1
                          WHEN 'PENDING' THEN 2
                          WHEN 'INACTIVE' THEN 3
                          WHEN 'REJECTED' THEN 4
                          ELSE 5
                      END,
                      s1.created_at DESC
              ) as rn
          FROM sellers s1
      ) s ON u.id = s.user_id AND s.rn = 1
      LEFT JOIN stores st ON s.store_id = st.id 
      LEFT JOIN user_suspensions us ON u.id = us.user_id 
      LEFT JOIN (
          SELECT 
              user_id, 
              GROUP_CONCAT(provider SEPARATOR '|') as ssoProvider
          FROM 
              social_accounts
          GROUP BY 
              user_id
      ) sa_grouped ON u.id = sa_grouped.user_id
      WHERE u.id = ?
    `;

    const result = await AppDataSource.query(query, [userId]);

    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "해당 사용자를 찾을 수 없습니다.",
      });
    }

    const userData = result[0];

    // SSO Provider 배열로 변환 (| 구분자로 분리)
    const providers = userData.ssoProvider ? userData.ssoProvider.split("|") : [];

    // UserDetailDto 형태로 데이터 변환
    const userDetail: UserDetailDto = {
      id: userData.id,
      profileImageUrl: userData.profileImageUrl || "",
      nickname: userData.nickname || "",
      name: userData.name,
      email: userData.email,
      phoneNumber: userData.phoneNumber || "",
      role: userData.role,
      status: userData.status,
      lastLoginAt: userData.lastLoginAt ? new Date(userData.lastLoginAt) : undefined,
      deletedAt: userData.deletedAt ? new Date(userData.deletedAt) : undefined,
      createdAt: new Date(userData.createdAt),
      storeId: userData.storeId || undefined,
      storeThumbnailUrl: userData.storeThumbnailUrl || "",
      storeName: userData.storeName || "",
      providers: providers,
      reason: userData.reason || "",
      suspendedUntil: userData.suspendedUntil ? new Date(userData.suspendedUntil) : undefined,
      suspendedById: userData.suspendedById || 0,
      suspendedAt: userData.suspendedAt ? new Date(userData.suspendedAt) : undefined,
      unsuspendedAt: userData.unsuspendedAt ? new Date(userData.unsuspendedAt) : null,
      sellerStatus: userData.sellerStatus || undefined,
    };

    res.status(200).json({
      success: true,
      data: userDetail,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "사용자 상세 정보 조회 중 오류가 발생했습니다.",
      errorCode: "FETCH_USER_DETAIL_ERROR",
      additionalContext: { userId: req.params.userId },
    });
  }
});

router.post("/suspend-user", async (req: AuthenticatedRequest, res) => {
  const { userId, reason, duration } = req.body;

  // 트랜잭션을 위한 QueryRunner 생성
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 사용자 존재 여부 확인
    const userRepo = queryRunner.manager.getRepository(User);
    const user = await userRepo.findOneBy({ id: userId });

    if (!user) {
      await queryRunner.rollbackTransaction();
      return res.status(404).json({
        success: false,
        error: "Not Found",
        message: "해당 사용자를 찾을 수 없습니다.",
      });
    }

    // 사용자 상태를 SUSPENDED로 변경
    user.status = USER_STATUSES.SUSPENDED;
    await userRepo.save(user);

    // 정지 정보 생성
    const suspendedById = req.user?.id;

    // 한국 시간대 기준으로 현재 시간 계산
    const now = new Date();
    const koreanTime = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC + 9시간

    const suspendedUntil =
      duration === "permanent"
        ? new Date("9999-12-31")
        : new Date(koreanTime.getTime() + parseInt(duration) * 24 * 60 * 60 * 1000);

    const userSuspensionRepo = queryRunner.manager.getRepository(UserSuspension);
    const newSuspension = userSuspensionRepo.create({
      userId,
      reason,
      suspendedUntil,
      suspendedById,
    });
    const savedSuspension = await userSuspensionRepo.save(newSuspension);

    // 트랜잭션 커밋
    await queryRunner.commitTransaction();

    res.status(200).json({
      success: true,
      data: {
        newStatus: user.status,
        suspensionId: savedSuspension.id,
        suspensionReason: savedSuspension.reason,
        suspensionUntil: savedSuspension.suspendedUntil,
        suspensionById: savedSuspension.suspendedById,
        suspensionAt: savedSuspension.createdAt,
      },
    });
  } catch (error) {
    // 트랜잭션 롤백
    await queryRunner.rollbackTransaction();
    handleError(error, req, res, {
      message: "사용자 정지 처리 중 오류가 발생했습니다.",
      errorCode: "SUSPEND_USER_ERROR",
      additionalContext: { userId: req.body.userId },
    });
  } finally {
    // QueryRunner 해제
    await queryRunner.release();
  }
});

// 정지 해제 API
router.post("/unsuspend-user", async (req: AuthenticatedRequest, res) => {
  const { userId } = req.body;

  // 트랜잭션을 위한 QueryRunner 생성
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 사용자 존재 여부 확인
    const userRepo = queryRunner.manager.getRepository(User);
    const user = await userRepo.findOneBy({ id: userId });

    if (!user) {
      await queryRunner.rollbackTransaction();
      return res.status(404).json({
        success: false,
        error: "Not Found",
        message: "해당 사용자를 찾을 수 없습니다.",
      });
    }

    // 사용자 상태를 ACTIVE로 변경
    user.status = USER_STATUSES.ACTIVE;
    await userRepo.save(user);

    // 정지 정보 업데이트 (가장 최근 정지 정보 중 해제되지 않은 것)
    const userSuspensionRepo = queryRunner.manager.getRepository(UserSuspension);
    const userSuspension = await userSuspensionRepo.findOne({
      where: {
        userId,
        unsuspendedAt: IsNull(),
      },
      order: { createdAt: "DESC" },
    });
    if (!userSuspension) {
      await queryRunner.rollbackTransaction();
      return res.status(404).json({
        success: false,
        error: "Not Found",
        message: "해당 사용자의 정지 정보를 찾을 수 없습니다.",
      });
    }
    await queryRunner.manager
      .createQueryBuilder()
      .update(UserSuspension)
      .set({ unsuspendedAt: () => "NOW()" })
      .where("id = :id", { id: userSuspension.id })
      .execute();

    // 트랜잭션 커밋
    await queryRunner.commitTransaction();

    res.status(200).json({
      success: true,
      data: user.status,
    });
  } catch (error) {
    // 트랜잭션 롤백
    await queryRunner.rollbackTransaction();
    handleError(error, req, res, {
      message: "사용자 정지 해제 처리 중 오류가 발생했습니다.",
      errorCode: "UNSUSPEND_USER_ERROR",
      additionalContext: { userId: req.body.userId },
    });
  } finally {
    // QueryRunner 해제
    await queryRunner.release();
  }
});

// #region Region Sync
router.get("/region", async (req, res) => {
  try {
    const API_KEY = process.env.DATA_GO_KR_REGION_API_KEY;
    if (!API_KEY) {
      throw new Error("API key for data.go.kr is not configured on the server.");
    }
    const baseUrl = "https://api.odcloud.kr/api/15123287/v1/uddi:b68902fa-d058-4a17-b188-ff46b7eaaac7";
    const response = await axios.get(baseUrl, {
      params: {
        page: 1,
        perPage: 1000,
        returnType: "JSON",
        serviceKey: API_KEY,
      },
    });

    res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (e) {
    console.error("Error during fetching region data", e);
    if (axios.isAxiosError(e) && e.response) {
      return res.status(e.response.status).json(e.response.data);
    }
    res.status(500).json({
      success: false,
      message: "Error fetching region data",
      error: "Internal Server Error",
    });
  }
});

router.post("/regions-sync-db", async (req, res) => {
  try {
    const API_KEY = process.env.DATA_GO_KR_REGION_API_KEY;
    if (!API_KEY) {
      throw new Error("API key for data.go.kr is not configured on the server.");
    }
    const uddi = "b68902fa-d058-4a17-b188-ff46b7eaaac7";
    const baseUrl = `https://api.odcloud.kr/api/15123287/v1/uddi:${uddi}`;

    const perPage = 10000;
    let page = 1;
    let totalFetched = 0;
    let hasMoreData = true;

    console.log("법정동 데이터 동기화를 시작합니다.");

    while (hasMoreData) {
      console.log(`${page}번째 페이지 데이터를 요청합니다...`);
      const response = await axios.get(baseUrl, {
        params: {
          page: page,
          perPage: perPage,
          returnType: "JSON",
          serviceKey: API_KEY,
        },
      });

      const records = response.data.data;
      const fetchedCount = records.length;

      if (fetchedCount > 0) {
        totalFetched += fetchedCount;
        console.log(`- ${fetchedCount}건의 데이터를 가져왔습니다. (총 ${totalFetched}건)`);

        const regionRepository = AppDataSource.getRepository(Region);
        const now = new Date();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const regionsToSave: RegionDto[] = records.map((record: any) => ({
          code: record["법정동코드"],
          name: record["법정동명"],
          isActive: record["폐지여부"] === "존재",
          lastSyncedAt: now,
        }));

        await regionRepository.save(regionsToSave);
        console.log(`- ${regionsToSave.length}건을 DB에 저장했습니다.`);
      }

      if (fetchedCount < perPage) {
        hasMoreData = false;
        console.log("모든 데이터를 성공적으로 가져왔습니다.");
      } else {
        page++;
      }
    }

    res.status(200).json({
      success: true,
      message: "법정동 데이터 동기화가 완료되었습니다.",
      totalFetched: totalFetched,
    });
  } catch (e) {
    console.error("Error during syncing region data", e);
    if (axios.isAxiosError(e) && e.response) {
      return res.status(e.response.status).json(e.response.data);
    }
    res.status(500).json({
      success: false,
      message: "Error syncing region data",
      error: "Internal Server Error",
    });
  }
});
// #endregion

// #region Report Management
// 신고 목록 조회
router.get("/reports", async (req, res) => {
  try {
    const { status, page = "1", limit = "10", sortBy = "createdAt", sortOrder = "DESC" } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const reportRepo = AppDataSource.getRepository(Report);

    // 총 개수 조회용 QueryBuilder (별도 쿼리)
    const countQueryBuilder = reportRepo.createQueryBuilder("report").innerJoin("report.reporter", "reporter");

    // 필터링
    if (
      status &&
      Object.values(REPORT_STATUSES).includes(status as (typeof REPORT_STATUSES)[keyof typeof REPORT_STATUSES])
    ) {
      countQueryBuilder.andWhere("report.status = :status", { status });
    }

    // 총 개수 조회
    const totalCount = await countQueryBuilder.getCount();

    // 데이터 조회용 QueryBuilder (relations 사용)
    const dataQueryBuilder = reportRepo
      .createQueryBuilder("report")
      .innerJoinAndSelect("report.reporter", "reporter")
      .select([
        "report.id",
        "report.status",
        "report.reportableType",
        "report.reasonType",
        "report.createdAt",
        "reporter.nickname",
      ]);

    // 필터링 (데이터 조회용에도 동일하게 적용)
    if (
      status &&
      Object.values(REPORT_STATUSES).includes(status as (typeof REPORT_STATUSES)[keyof typeof REPORT_STATUSES])
    ) {
      dataQueryBuilder.andWhere("report.status = :status", { status });
    }

    // 정렬
    const validSortBy = sortBy === "createdAt" || sortBy === "handledAt" ? sortBy : "createdAt";
    const validSortOrder = sortOrder === "ASC" || sortOrder === "DESC" ? sortOrder : "DESC";
    dataQueryBuilder.orderBy(`report.${validSortBy}`, validSortOrder);

    // 페이지네이션 (getMany()와 함께 사용하면 정상 작동)
    dataQueryBuilder.skip(skip).take(limitNum);

    // 엔티티 데이터 조회
    const reports = await dataQueryBuilder.getMany();

    // DTO 변환
    const reportsWithDto: ReportListDto[] = reports.map((report) => ({
      id: report.id,
      status: report.status,
      reportableType: report.reportableType,
      reasonType: report.reasonType,
      createdAt: report.createdAt,
      reporterNickname: report.reporter?.nickname,
    }));

    const totalPages = Math.ceil(totalCount / limitNum);

    const response: ReportListResponse = {
      reports: reportsWithDto,
      totalCount,
      totalPages,
      currentPage: pageNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "신고 목록 조회 중 오류가 발생했습니다.",
      errorCode: "FETCH_REPORTS_ERROR",
    });
  }
});

router.get("/reports/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const reportId = parseInt(id, 10);

    if (isNaN(reportId) || reportId <= 0) {
      return res.status(400).json({
        success: false,
        message: "유효하지 않은 신고 ID입니다.",
      });
    }

    // 신고 타입별로 통합된 쿼리
    const query = `
      SELECT
        r.id as id,
        u.nickname as reporterNickname,
        u.profile_image_url as reporterImageUrl,
        r.status as status,
        r.reportable_type as reportableType,
        r.reason_type as reasonType,
        r.reason_detail as reasonDetail,
        r.admin_id as adminId,
        r.action_taken as actionTaken,
        r.handled_at as handledAt,
        r.created_at as createdAt,
        -- 공통 링크 및 작성자 정보 (타입별 조건부)
        CASE
          WHEN r.reportable_type = 'POST' THEN CONCAT('/', COALESCE(c_post.name, ''), '/', r.reportable_id)
          WHEN r.reportable_type = 'COMMENT' THEN CONCAT('/', COALESCE(c_comment.name, ''), '/', COALESCE(c2.post_id, ''))
          WHEN r.reportable_type = 'STORE' THEN CONCAT('/store/', r.reportable_id)
          ELSE NULL
        END as link,
        CASE
          WHEN r.reportable_type = 'POST' THEN u_post.nickname
          WHEN r.reportable_type = 'COMMENT' THEN u_comment.nickname
          ELSE NULL
        END as authorNickname,
        -- 타입별 내용
        CASE
          WHEN r.reportable_type = 'POST' THEN p.content
          WHEN r.reportable_type = 'COMMENT' THEN c2.content
          ELSE NULL
        END as content,
        -- 게시글 전용 제목
        CASE
          WHEN r.reportable_type = 'POST' THEN p.title
          ELSE NULL
        END as postTitle
      FROM reports r
      LEFT JOIN users u ON r.reporter_user_id = u.id
      -- 게시글 관련 조인
      LEFT JOIN posts p ON r.reportable_type = 'POST' AND r.reportable_id = p.id
      LEFT JOIN users u_post ON r.reportable_type = 'POST' AND p.user_id = u_post.id
      LEFT JOIN post_categories pc_post ON r.reportable_type = 'POST' AND pc_post.post_id = p.id
      LEFT JOIN categories c_post ON pc_post.category_id = c_post.id
      -- 댓글 관련 조인
      LEFT JOIN comments c2 ON r.reportable_type = 'COMMENT' AND r.reportable_id = c2.id
      LEFT JOIN users u_comment ON r.reportable_type = 'COMMENT' AND c2.user_id = u_comment.id
      LEFT JOIN post_categories pc_comment ON r.reportable_type = 'COMMENT' AND pc_comment.post_id = c2.post_id
      LEFT JOIN categories c_comment ON pc_comment.category_id = c_comment.id
      -- 매장 관련 조인
      LEFT JOIN stores s ON r.reportable_type = 'STORE' AND r.reportable_id = s.id
      WHERE r.id = ?
    `;

    const result = await AppDataSource.query(query, [reportId]);

    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "해당 신고를 찾을 수 없습니다.",
      });
    }

    const reportData = result[0];

    // DTO 형식으로 변환
    const reportDetail: ReportDetailDto = {
      id: reportData.id,
      status: reportData.status,
      createdAt: reportData.createdAt,
      reasonType: reportData.reasonType || undefined,
      reportableType: reportData.reportableType,
      reasonDetail: reportData.reasonDetail || undefined,
      adminId: reportData.adminId || undefined,
      handledAt: reportData.handledAt || undefined,
      actionTaken: reportData.actionTaken || undefined,
      reporterNickname: reportData.reporterNickname || undefined,
      reporterImageUrl: reportData.reporterImageUrl || undefined,
      link: reportData.link || undefined,
      authorNickname: reportData.authorNickname || undefined,
      content: reportData.content || undefined,
      postTitle: reportData.postTitle || undefined,
    };

    console.log(reportDetail);

    res.status(200).json({
      success: true,
      data: reportDetail,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "신고 상세 조회 중 오류가 발생했습니다.",
      errorCode: "FETCH_REPORT_ERROR",
      additionalContext: { reportId: req.params.id },
    });
  }
});

router.post("/reports/:id/process", async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const reportId = parseInt(id, 10);
    const { status, actionTaken } = req.body;

    if (isNaN(reportId) || reportId <= 0) {
      return res.status(400).json({
        success: false,
        message: "유효하지 않은 신고 ID입니다.",
      });
    }

    if (!status || (!actionTaken && status !== REPORT_STATUSES.DISMISSED)) {
      return res.status(400).json({
        success: false,
        message: "처리 상태와 처리 내용을 입력해주세요.",
      });
    }

    const reportRepo = AppDataSource.getRepository(Report);
    const report = await reportRepo.findOne({ where: { id: reportId } });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "해당 신고를 찾을 수 없습니다.",
      });
    }

    if (report.status !== REPORT_STATUSES.PENDING) {
      return res.status(400).json({
        success: false,
        message: "이미 처리된 신고입니다.",
      });
    }

    report.status = status;
    report.actionTaken = actionTaken;
    report.adminId = req.user?.id;
    report.handledAt = new Date();
    await reportRepo.save(report);

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "신고 처리 중 오류가 발생했습니다.",
      errorCode: "PROCESS_REPORT_ERROR",
      additionalContext: { reportId: req.params.id },
    });
  }
});
// #endregion

export default router;
