import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../db";
import { User } from "../typeorm/users.entity";
import { SocialAccount } from "../typeorm/socialAccounts.entity";
import { Seller } from "../typeorm/sellers.entity";
import { UserUpdateData } from "../../../shared/types";
import { nanoid } from "nanoid";
import { ROLES } from "../../../shared/constants";
import { Not } from "typeorm";
import { isAuthenticated, AuthenticatedRequest } from "../middlewares/auth.middleware";
import { AgreementState, SignupUserInfo } from "shared/user_v2.types";
import { UserAgreement } from "../typeorm/userAgreements.entity";

// 타입을 명확하게 하기 위해 TokenPayload 인터페이스 정의
interface SsoSignupTokenPayload {
  provider: string;
  providerUserId: string;
  email: string;
  name: string;
  gender?: "M" | "F";
  phoneNumber?: string;
  birthYear?: string;
  birthday?: string; // MM-DD
}

const router = Router();

router.post("/signup", async (req, res) => {
  const payload = req.body;
  const isSsoSignup: boolean = payload.isSsoSignup;
  const userInfo: SignupUserInfo = payload.userInfo;
  const agreements: AgreementState = payload.agreements;
  const signupToken = payload.signupToken;
  //const storeId = payload.storeId;

  const isAcceptedAllAgreements = agreements.agreePrivacyUse && agreements.agreeAgeOver14 && agreements.agreeTerms;

  if (!agreements || !isAcceptedAllAgreements) {
    return res.status(400).json({
      success: false,
      message: "약관 동의가 필요합니다.",
      error: "Agreement data not found",
    });
  }

  await AppDataSource.transaction(async (transactionalEntityManager) => {
    // SSO 회원가입일 때, SocialAccount table data 중복 확인
    if (isSsoSignup) {
      const decoded = jwt.verify(
        signupToken,
        process.env.JWT_SIGNUP_SECRET || "default_signup_secret",
      ) as SsoSignupTokenPayload;

      const existingSocialAccount = await transactionalEntityManager.findOne(SocialAccount, {
        where: {
          provider: decoded.provider,
          providerUserId: decoded.providerUserId,
        },
      });

      if (existingSocialAccount) throw new Error("ALREADY_LINKED_ACCOUNT");
    }

    const userRepo = AppDataSource.getRepository(User);

    // users table에서 이메일 중복 확인
    const existingUserByEmail = await userRepo.findOne({
      where: { email: userInfo.email },
    });
    if (existingUserByEmail) throw new Error("EMAIL_ALREADY_EXISTS");

    // users table에서 전화번호 중복 확인
    const existingUserByPhone = await userRepo.findOne({
      where: { phoneNumber: userInfo.phoneNumber },
    });
    if (existingUserByPhone) throw new Error("PHONE_ALREADY_EXISTS");

    //TODO: 여기서 users 테이블 데이터 생성 및 insert
    //아래 코드 리팩토링해서 작성해라. 넘무 복잡하다.

    // 1. [ SSO 회원가입 ]
    // 1-1. Signup token 유효성 체크 ✅ (완)
    // 1-2. DB에 사용자 정보 중복 체크(SocialAccount table + users.email, users.phone_number) (완)
    // 1-3. new user data 생성(랜덤 닉네임 생성, 생년월일 및 연령대 가공)
    // 1-4. new user data insert
    // 1-5. 판매자 role로 가입 시, sellers 테이블 데이터 삽입
    // 1-6. SocialAccount 테이블 데이터 삽입 ✅

    // 2. [ 일반 회원가입 ]
    // 2-1. DB에 사용자 정보 중복 체크(users.email, users.phone_number)
    // 2-2. new user data 생성(랜덤 닉네임 생성, 생년월일 및 연령대 가공)
    // 2-3. new user data insert
    // 2-4. 판매자 role로 가입 시, sellers 테이블 데이터 삽입

    const newUser = new User();
    newUser.email = userInfo.email;
    newUser.name = userInfo.name;
    newUser.role = userInfo.role;
    if (!isSsoSignup) newUser.password = userInfo.password;
    newUser.nickname = userInfo.nickname;
    newUser.phoneNumber = userInfo.phoneNumber;
    newUser.gender = userInfo.gender || undefined;

    const savedUser = await transactionalEntityManager.save(newUser);

    // 위에서 생성된 new user의 agreement data insert
    const agreementRepo = AppDataSource.getRepository(UserAgreement);
    const newAgreement = agreementRepo.create({
      userId: savedUser.id,
      agreePrivacyUse: agreements.agreePrivacyUse,
      agreeAgeOver14: agreements.agreeAgeOver14,
      agreeTerms: agreements.agreeTerms,
    });

    //const savedAgreement = await agreementRepo.save(newAgreement);
    await agreementRepo.save(newAgreement);

    res.status(201).json({
      success: true,
      message: "회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.",
    });
  });

  if (isSsoSignup) {
    // --- SSO 회원가입 ---
    try {
      const decoded = jwt.verify(
        signupToken,
        process.env.JWT_SIGNUP_SECRET || "default_signup_secret",
      ) as SsoSignupTokenPayload;

      await AppDataSource.transaction(async (transactionalEntityManager) => {
        // 1. 소셜 계정 정보가 이미 DB에 있는지 확인

        const userRepo = AppDataSource.getRepository(User);

        // 3. Users 테이블에 새로운 사용자 생성
        const newUser = new User();
        newUser.email = decoded.email;
        newUser.name = decoded.name;

        // 닉네임 자동 생성 (user_{nanoid}) - 중복 확인 포함
        let isNicknameUnique = false;
        let generatedNickname = "";
        while (!isNicknameUnique) {
          // 'user_' 접두사와 10자리 nanoid 결합
          generatedNickname = nanoid(10);
          const existingNickname = await userRepo.findOne({
            where: { nickname: generatedNickname },
          });

          if (!existingNickname) isNicknameUnique = true;
        }
        newUser.nickname = generatedNickname;

        // SSO 정보 + 사용자가 추가 입력한 정보
        newUser.gender = userInfo.gender || decoded.gender;
        //newUser.phoneNumber = finalPhoneNumber;

        // 생년월일 및 연령대 처리
        const birthDate = userInfo.birthday; // YYYY-MM-DD
        if (birthDate) {
          const birthYear = Number(birthDate.split("-")[0]);
          newUser.birthYear = birthYear;
          newUser.birthday = `${birthDate.split("-")[1]}-${birthDate.split("-")[2]}`;

          const currentYear = new Date().getFullYear();
          const age = currentYear - birthYear;
          if (age >= 0) {
            const startOfRange = Math.floor(age / 10) * 10;
            newUser.ageRange = `${startOfRange}-${startOfRange + 9}`;
          }
        } else if (decoded.birthYear && decoded.birthday) {
          const birthYear = Number(decoded.birthYear);
          newUser.birthYear = birthYear;
          newUser.birthday = decoded.birthday;

          const currentYear = new Date().getFullYear();
          const age = currentYear - birthYear;
          if (age >= 0) {
            const startOfRange = Math.floor(age / 10) * 10;
            newUser.ageRange = `${startOfRange}-${startOfRange + 9}`;
          }
        }

        newUser.role = userInfo.role;
        newUser.address = userInfo.address;
        newUser.addressDetail = userInfo.addressDetail;
        newUser.postalCode = userInfo.postalCode;
        newUser.sido = userInfo.sido;
        newUser.sigungu = userInfo.sigungu;
        // SSO 가입 시 password는 null

        const savedUser = await transactionalEntityManager.save(newUser);

        // 판매자일 경우 sellers 테이블에 추가
        if (savedUser.role === ROLES.SELLER && userInfo.storeId !== -8574) {
          if (!userInfo.storeId) {
            throw new Error("STORE_ID_REQUIRED");
          }
          const newSeller = new Seller();
          newSeller.userId = savedUser.id;
          newSeller.storeId = userInfo.storeId;
          newSeller.status = "PENDING";
          await transactionalEntityManager.save(newSeller);
        }

        // 3. SocialAccounts 테이블에 데이터 생성
        const newSocialAccount = new SocialAccount();
        newSocialAccount.userId = savedUser.id;
        newSocialAccount.provider = decoded.provider;
        newSocialAccount.providerUserId = decoded.providerUserId;

        await transactionalEntityManager.save(newSocialAccount);
      });

      res.status(201).json({
        success: true,
        message: "소셜 회원가입을 통해 정상적으로 가입되었습니다!",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          message: "유효하지 않은 가입 토큰입니다.",
          error: "Unauthorized",
        });
      }
      if (error.message === "ALREADY_LINKED_ACCOUNT") {
        return res.status(409).json({
          success: false,
          message: "이미 연동된 소셜 계정입니다.",
          error: "Conflict",
        });
      }
      if (error.message === "EMAIL_ALREADY_EXISTS") {
        return res.status(409).json({
          success: false,
          message: "이미 가입된 이메일입니다.",
          error: "Conflict",
        });
      }
      if (error.message === "PHONE_ALREADY_EXISTS") {
        return res.status(409).json({
          success: false,
          message: "이미 사용 중인 전화번호입니다.",
          error: "Conflict",
        });
      }
      if (error.message === "STORE_ID_REQUIRED") {
        return res.status(400).json({
          success: false,
          message: "판매자 가입 시 소속 매장을 선택해야 합니다.",
          error: "Bad Request",
        });
      }
      console.error("SSO Signup Error:", error);
      return res.status(500).json({
        success: false,
        message: "SSO 회원가입 중 오류가 발생했습니다.",
        error: "Internal Server Error",
      });
    }
  } else {
    // --- 일반 회원가입 ---
    try {
      await AppDataSource.transaction(async (transactionalEntityManager) => {
        const userRepo = transactionalEntityManager.getRepository(User);

        // 1. 이메일 중복 확인
        const existingUserByEmail = await userRepo.findOne({
          where: { email: userInfo.email },
        });
        if (existingUserByEmail) {
          throw new Error("EMAIL_ALREADY_EXISTS");
        }

        // 2. 전화번호 중복 확인 (입력된 경우)
        if (userInfo.phoneNumber) {
          const existingUserByPhone = await userRepo.findOne({
            where: { phoneNumber: userInfo.phoneNumber },
          });
          if (existingUserByPhone) {
            throw new Error("PHONE_ALREADY_EXISTS");
          }
        }

        // 3. 비밀번호 해싱
        if (!userInfo.password) {
          throw new Error("PASSWORD_REQUIRED");
        }
        const hashedPassword = await bcrypt.hash(userInfo.password, 10);

        // 4. 새로운 사용자 생성
        const newUser = new User();
        newUser.email = userInfo.email;
        newUser.password = hashedPassword;
        newUser.name = userInfo.name;

        // 닉네임 자동 생성 (user_{nanoid}) - 중복 확인 포함
        let isNicknameUnique = false;
        let generatedNickname = "";
        while (!isNicknameUnique) {
          // 'user_' 접두사와 10자리 nanoid 결합
          generatedNickname = nanoid(10);
          const existingNickname = await userRepo.findOne({
            where: { nickname: generatedNickname },
          });

          if (!existingNickname) {
            isNicknameUnique = true;
          }
        }
        newUser.nickname = generatedNickname;

        // 선택 정보
        newUser.gender = userInfo.gender == "" ? undefined : userInfo.gender;
        newUser.phoneNumber = userInfo.phoneNumber;
        const birthDate = userInfo.birthday; // YYYY-MM-DD
        if (birthDate) {
          const birthYear = Number(birthDate.split("-")[0]);
          newUser.birthYear = birthYear;
          newUser.birthday = `${birthDate.split("-")[1]}-${birthDate.split("-")[2]}`;

          const currentYear = new Date().getFullYear();
          const age = currentYear - birthYear;
          if (age >= 0) {
            const startOfRange = Math.floor(age / 10) * 10;
            newUser.ageRange = `${startOfRange}-${startOfRange + 9}`;
          }
        }
        newUser.role = userInfo.role;
        newUser.address = userInfo.address;
        newUser.addressDetail = userInfo.addressDetail;
        newUser.postalCode = userInfo.postalCode;
        newUser.sido = userInfo.sido;
        newUser.sigungu = userInfo.sigungu;

        const savedUser = await userRepo.save(newUser);

        // 판매자일 경우 sellers 테이블에 추가
        if (savedUser.role === ROLES.SELLER && userInfo.storeId !== -8574) {
          if (!userInfo.storeId) {
            throw new Error("STORE_ID_REQUIRED");
          }
          const sellerRepo = transactionalEntityManager.getRepository(Seller);
          const newSeller = new Seller();
          newSeller.userId = savedUser.id;
          newSeller.storeId = userInfo.storeId;
          await sellerRepo.save(newSeller);
        }
      });

      res.status(201).json({
        success: true,
        message: "성공적으로 가입되었습니다!",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.message === "EMAIL_ALREADY_EXISTS") {
        return res.status(409).json({
          success: false,
          message: "이미 가입된 이메일입니다.",
          error: "Conflict",
        });
      }
      if (error.message === "PHONE_ALREADY_EXISTS") {
        return res.status(409).json({
          success: false,
          message: "이미 사용 중인 전화번호입니다.",
          error: "Conflict",
        });
      }
      if (error.message === "PASSWORD_REQUIRED") {
        return res.status(400).json({
          success: false,
          message: "비밀번호를 입력해주세요.",
          error: "Bad Request",
        });
      }
      if (error.message === "STORE_ID_REQUIRED") {
        return res.status(400).json({
          success: false,
          message: "판매자 가입 시 소속 매장을 선택해야 합니다.",
          error: "Bad Request",
        });
      }
      console.error("Traditional Signup Error:", error);
      res.status(500).json({
        success: false,
        message: "회원가입 중 오류가 발생했습니다.",
        error: "Internal Server Error",
      });
    }
  }
});

router.get("/profile", async (req, res) => {
  const { userId } = req.query;
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: Number(userId) } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    // 사용자 정보를 응답 데이터로 복사
    const responseData = { ...user } as User & { storeId?: number };

    // 사용자가 판매자인 경우 sellers 테이블에서 매장 정보 조회
    if (user.role === ROLES.SELLER) {
      const sellerRepo = AppDataSource.getRepository(Seller);
      const sellerInfo = await sellerRepo.findOne({
        where: { userId: user.id },
      });

      // 판매자 정보를 응답 데이터에 추가
      if (sellerInfo) responseData.storeId = sellerInfo.storeId;
    }

    // 비밀번호 필드 제거
    delete responseData.password;

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error fetching user information:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "사용자 정보를 불러오는 중 오류가 발생했습니다.",
    });
  }
});

router.post("/profile", isAuthenticated, async (req, res) => {
  const userUpdateData: UserUpdateData = req.body;
  if (!userUpdateData.id) {
    return res.status(401).json({ success: false, message: "인증 정보가 유효하지 않습니다." });
  }

  try {
    // 트랜잭션 시작
    const result = await AppDataSource.transaction(async (transactionalEntityManager) => {
      const userRepo = transactionalEntityManager.getRepository(User);
      const sellerRepo = transactionalEntityManager.getRepository(Seller);

      // 사용자 조회
      const userToUpdate = await userRepo.findOne({
        where: { id: userUpdateData.id },
      });

      if (!userToUpdate) {
        throw new Error("사용자를 찾을 수 없습니다.");
      }

      // 닉네임 변경 시 중복 확인
      if (userUpdateData.nickname && userUpdateData.nickname !== userToUpdate.nickname) {
        const existingUser = await userRepo.findOne({
          where: {
            nickname: userUpdateData.nickname,
            id: Not(userUpdateData.id),
          },
        });
        if (existingUser) {
          throw new Error("이미 사용 중인 닉네임입니다.");
        }
        userToUpdate.nickname = userUpdateData.nickname;
      }

      // 비밀번호 변경
      if (userUpdateData.password) {
        userToUpdate.password = await bcrypt.hash(userUpdateData.password, 10);
      }

      // 기타 정보 업데이트
      if (userUpdateData.profileImageUrl !== undefined) userToUpdate.profileImageUrl = userUpdateData.profileImageUrl;
      if (userUpdateData.address !== undefined) userToUpdate.address = userUpdateData.address;
      if (userUpdateData.addressDetail !== undefined) userToUpdate.addressDetail = userUpdateData.addressDetail;
      if (userUpdateData.postalCode !== undefined) userToUpdate.postalCode = userUpdateData.postalCode;
      if (userUpdateData.sido !== undefined) userToUpdate.sido = userUpdateData.sido;
      if (userUpdateData.sigungu !== undefined) userToUpdate.sigungu = userUpdateData.sigungu;

      // 생년월일 업데이트 (YYYY-MM-DD 형식)
      if (userUpdateData.birthday !== undefined) {
        const birthDate = userUpdateData.birthday;
        if (birthDate) {
          const birthYear = Number(birthDate.split("-")[0]);
          userToUpdate.birthYear = birthYear;
          userToUpdate.birthday = `${birthDate.split("-")[1]}-${birthDate.split("-")[2]}`;

          // 연령대 계산
          const currentYear = new Date().getFullYear();
          const age = currentYear - birthYear;
          if (age >= 0 && age < 150) {
            const startOfRange = Math.floor(age / 10) * 10;
            userToUpdate.ageRange = `${startOfRange}-${startOfRange + 9}`;
          }
        }
      }

      // 일반 사용자 -> 판매자 전환인 경우
      if (userToUpdate.role === ROLES.USER && userUpdateData.role === ROLES.SELLER && userUpdateData.storeId) {
        // 이미 판매자로 등록되어 있는지 확인
        const existingSeller = await sellerRepo.findOne({
          where: {
            userId: userToUpdate.id,
            storeId: userUpdateData.storeId,
          },
        });

        if (existingSeller) {
          // INACTIVE 상태인 경우 PENDING으로 재활성화
          if (existingSeller.status === "INACTIVE") {
            existingSeller.status = "PENDING";
            await sellerRepo.save(existingSeller);
          } else if (existingSeller.status === "ACTIVE") {
            throw new Error("이미 해당 매장의 활성화된 판매자로 등록되어 있습니다.");
          } else if (existingSeller.status === "PENDING") {
            throw new Error("이미 해당 매장의 판매자 승인 대기 중입니다.");
          } else if (existingSeller.status === "REJECTED") {
            throw new Error("해당 매장의 판매자 승인이 거절되었습니다. 관리자에게 문의하세요.");
          }
        } else {
          // 새로운 seller 레코드 생성
          const newSeller = new Seller();
          newSeller.userId = userToUpdate.id;
          newSeller.storeId = userUpdateData.storeId;
          newSeller.status = "PENDING";
          await sellerRepo.save(newSeller);
        }
      }

      if (userUpdateData.role && [ROLES.USER, ROLES.SELLER, ROLES.ADMIN].includes(userUpdateData.role)) {
        userToUpdate.role = userUpdateData.role;
      }

      // 사용자 정보 저장
      const savedUser = await userRepo.save(userToUpdate);

      // 응답 데이터에서 비밀번호 필드 제거
      delete savedUser.password;

      return savedUser;
    });

    res.status(200).json({
      success: true,
      message: "프로필이 성공적으로 업데이트되었습니다.",
      data: result,
    });
  } catch (error) {
    console.error("Profile update error:", error);

    // 특정 에러 메시지에 따른 상태 코드 결정
    if (error instanceof Error) {
      if (error.message === "사용자를 찾을 수 없습니다.") {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message === "이미 사용 중인 닉네임입니다.") {
        return res.status(409).json({ success: false, message: error.message });
      }
      if (error.message === "이미 해당 매장의 판매자로 등록되어 있습니다.") {
        return res.status(409).json({ success: false, message: error.message });
      }
    }

    res.status(500).json({
      success: false,
      message: "프로필 업데이트 중 오류가 발생했습니다.",
      error: "Internal Server Error",
    });
  }
});

router.get("/social-accounts/:userId", isAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const socialAccounts = await AppDataSource.getRepository(SocialAccount).find({ where: { userId: Number(userId) } });

    const responseData: { naver: boolean; kakao: boolean } = {
      naver: socialAccounts.some((account) => account.provider === "naver"),
      kakao: socialAccounts.some((account) => account.provider === "kakao"),
    };

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Social accounts error:", error);
    res.status(500).json({
      success: false,
      message: "소셜 계정 조회 중 오류가 발생했습니다.",
      error: "Internal Server Error",
    });
  }
});

// 사용자 즐겨찾기 매장 조회
router.get("/favorites", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "인증이 필요합니다.",
      });
    }

    const query = `
      SELECT 
        s.id,
        s.thumbnail_url,
        s.name,
        s.address,
        s.address_detail
      FROM users u 
      JOIN user_favorites f ON u.id = f.user_id 
      JOIN stores s ON f.store_id = s.id
      WHERE u.id = ?
      ORDER BY f.created_at DESC;
    `;

    const result = await AppDataSource.query(query, [userId]);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("User favorites error:", error);
    res.status(500).json({
      success: false,
      message: "즐겨찾기 매장 조회 중 오류가 발생했습니다.",
      error: "Internal Server Error",
    });
  }
});

router.get("/check-unlink/:provider", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "인증이 필요합니다.",
      });
    }

    // 소셜 계정 존재 여부 확인
    const socialAccounts = await AppDataSource.getRepository(SocialAccount).find({
      where: { userId: userId, provider: provider },
    });

    if (socialAccounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "소셜 계정을 찾을 수 없습니다.",
      });
    }

    // 소셜 계정 해제 가능 여부 확인 쿼리
    const canRemoveQuery = `
      SELECT
          CASE
              WHEN 
                  user_info.password IS NULL 
                  AND user_info.account_count = 1 
                  AND user_info.single_provider = ? 
              THEN 0
              ELSE 1 
          END AS result
      FROM (
          SELECT
              u.password,
              COUNT(sa.id) AS account_count,
              MAX(sa.provider) AS single_provider
          FROM users u
          LEFT JOIN social_accounts sa ON u.id = sa.user_id
          WHERE u.id = ?
          GROUP BY u.id, u.password
      ) AS user_info;
    `;

    const canRemoveResult = await AppDataSource.query(canRemoveQuery, [provider, userId]);
    const canRemove = Number(canRemoveResult[0]?.result) === 1;

    res.status(200).json({
      success: true,
      data: canRemove,
    });
  } catch (error) {
    console.error("소셜 계정 해제 가능 여부 확인 중 오류:", error);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: "Internal Server Error",
    });
  }
});

export default router;
