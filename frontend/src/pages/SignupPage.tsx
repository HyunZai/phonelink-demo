import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { api } from "../api/axios";
import { toast } from "sonner";
import type { SignupFormData, StoreDto, DaumPostcodeData } from "../../../shared/types";
import type { SignupUserInfo } from "../../../shared/user_v2.types";
import AddressSearchButton from "../components/AddressSearchButton";
import StoreSearchableSelect from "../components/StoreSearchableSelect";
import { ROLES } from "../../../shared/constants";
import { useSignupStore } from "../store/signupStore";

const SignupPage: React.FC = () => {
  const { isSsoSignup, agreements, userInfo, setIsSsoSignup, setUserInfo, loadSocialUserInfo, reset } =
    useSignupStore();
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof SignupFormData | "passwordConfirm", string>>>({});

  const [signupToken, setSignupToken] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreDto | null>(null);
  const [stores, setStores] = useState<StoreDto[]>([]); // 대리점 목록 상태 추가
  const handleStoreSelect = (store: StoreDto | null) => {
    setSelectedStore(store);
    setUserInfo("storeId", store?.id ?? undefined);
  };

  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { ssoData?: any; signupToken?: string } | null;
  const addressDetailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userInfo.role !== ROLES.SELLER && selectedStore) {
      setSelectedStore(null);
      setUserInfo("storeId", undefined);
    }
  }, [selectedStore, setUserInfo, userInfo.role]);

  const isAcceptedAllAgreements = agreements.agreePrivacyUse && agreements.agreeAgeOver14 && agreements.agreeTerms;

  const setSsoDataAndToken = () => {
    if (!isAcceptedAllAgreements) {
      toast.error("약관 동의가 필요합니다!!!!!!!!!!!!");
      navigate("/agreement", { replace: true });
      return;
    }

    const hydrateSocialData = (rawData: any, token: string | null) => {
      const birthdate = rawData?.birthYear && rawData?.birthday ? `${rawData.birthYear}-${rawData.birthday}` : "";

      loadSocialUserInfo({
        email: rawData?.email || "",
        name: rawData?.name || "",
        gender: rawData?.gender || "M",
        phoneNumber: rawData?.phoneNumber?.replace("+82 ", "0") || "",
        birthday: birthdate,
        provider: rawData?.provider || "local",
      });
      setSignupToken(token);
    };

    const ssoSignupToken = sessionStorage.getItem("ssoSignupToken");
    const ssoSignupDataStr = sessionStorage.getItem("ssoSignupData");

    if (ssoSignupToken && ssoSignupDataStr) {
      try {
        const ssoData = JSON.parse(ssoSignupDataStr);
        hydrateSocialData(ssoData, ssoSignupToken);
      } catch (error) {
        console.error("SSO 데이터 파싱 오류:", error);
        toast.error("회원가입 정보를 불러오는데 실패했습니다.");
        navigate("/agreement", { replace: true });
      }
      return;
    }

    if (locationState?.ssoData) {
      hydrateSocialData(locationState.ssoData, locationState.signupToken || null);
      return;
    }

    setIsSsoSignup(false);
    setSignupToken(null);
  };

  useEffect(() => {
    if (isSsoSignup) setSsoDataAndToken();

    const fetchStores = async () => {
      try {
        const storesData = await api.get<StoreDto[]>("/store/stores");
        setStores(storesData);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          toast.error(error.response.data.message || "매장 목록을 불러오는데 실패했습니다.");
        } else {
          toast.error("매장 목록을 불러오는데 실패했습니다.");
        }
      }
    };

    fetchStores();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const target = e.target as HTMLInputElement;

    if (name === "role" && target.type === "checkbox") {
      const isChecked = target.checked;
      setUserInfo("role", isChecked ? ROLES.SELLER : ROLES.USER);
      return;
    }

    if (name === "phoneNumber") {
      const formattedPhoneNumber = value
        .replace(/[^0-9]/g, "")
        .replace(/^(\d{0,3})(\d{0,4})(\d{0,4})$/, "$1-$2-$3")
        .replace(/(-{1,2})$/g, "");
      setUserInfo("phoneNumber", formattedPhoneNumber);
      return;
    }

    setUserInfo(name as keyof SignupUserInfo, name === "birthYear" ? Number(value) || undefined : value);
  };

  const handleAddressComplete = (data: DaumPostcodeData) => {
    let fullAddress = data.address;
    let extraAddress = "";

    if (data.addressType === "R") {
      if (data.bname !== "") {
        extraAddress += data.bname;
      }
      if (data.buildingName !== "") {
        extraAddress += extraAddress !== "" ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== "" ? ` (${extraAddress})` : "";
    }

    setUserInfo("postalCode", data.zonecode);
    setUserInfo("sido", data.sido);
    setUserInfo("sigungu", data.sigungu);
    setUserInfo("address", fullAddress);
    // 상세 주소 필드로 포커스 이동
    addressDetailRef.current?.focus();
  };

  const validatePassword = () => {
    const { password } = userInfo;
    let errorMessage = "";

    if (!password) {
      errorMessage = "비밀번호를 입력해주세요.";
    } else if (password.length < 10) {
      errorMessage = "비밀번호는 10자 이상이어야 합니다.";
    } else if (!/[a-z]/.test(password)) {
      errorMessage = "비밀번호에는 소문자가 포함되어야 합니다.";
    } else if (!/[0-9]/.test(password)) {
      errorMessage = "비밀번호에는 숫자가 포함되어야 합니다.";
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errorMessage = "비밀번호에는 특수문자가 포함되어야 합니다.";
    }

    setErrors((prev) => ({ ...prev, password: errorMessage }));
    return errorMessage === "";
  };

  const validatePasswordConfirm = () => {
    if (!passwordConfirm) {
      setErrors((prev) => ({
        ...prev,
        passwordConfirm: "비밀번호를 다시 한번 입력해주세요.",
      }));
      return false;
    }
    if ((userInfo.password || "") !== passwordConfirm) {
      setErrors((prev) => ({
        ...prev,
        passwordConfirm: "비밀번호가 일치하지 않습니다.",
      }));
      return false;
    }
    setErrors((prev) => ({ ...prev, passwordConfirm: "" }));
    return true;
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors: Partial<Record<keyof SignupFormData | "passwordConfirm", string>> = {};
    let formIsValid = true;

    // --- Common Fields Validation ---
    if (!userInfo.name) {
      newErrors.name = "이름을 입력해주세요.";
      formIsValid = false;
    }
    if (!userInfo.gender) {
      newErrors.gender = "성별을 선택해주세요.";
      formIsValid = false;
    }

    // 전화번호는 필수 사항, 입력 시 형식 검사
    if (!userInfo.phoneNumber) {
      newErrors.phoneNumber = "전화번호를 입력해주세요.";
      formIsValid = false;
    } else if (userInfo.phoneNumber.length !== 13) {
      newErrors.phoneNumber = "전화번호 11자리를 올바르게 입력해주세요.";
      formIsValid = false;
    }

    // --- Traditional Signup Fields Validation ---
    if (!isSsoSignup) {
      if (!userInfo.email) {
        newErrors.email = "이메일을 입력해주세요.";
        formIsValid = false;
      } else if (!/^\S+@\S+\.\S+$/.test(userInfo.email)) {
        newErrors.email = "올바른 이메일 형식이 아닙니다.";
        formIsValid = false;
      }

      const isPasswordValid = validatePassword();
      const isPasswordConfirmValid = validatePasswordConfirm();
      if (!isPasswordValid || !isPasswordConfirmValid) {
        formIsValid = false;
      }
    }

    setErrors(newErrors);

    if (!formIsValid) {
      toast.error("입력 정보를 다시 확인해주세요.");
      return;
    }

    if (userInfo.role === ROLES.SELLER && !selectedStore) {
      toast.error("판매자 가입 시 소속 매장을 선택해야 합니다.");
      return;
    }

    try {
      const payload = {
        isSsoSignup: isSsoSignup,
        userInfo: userInfo,
        agreements: agreements,
        ...(isSsoSignup && { signupToken }),
        ...(userInfo.role === ROLES.SELLER && { storeId: selectedStore?.id }),
      };

      console.log(payload);

      await api.post("/user/signup", payload);

      // 회원가입 성공 시 sessionStorage 정리
      sessionStorage.removeItem("ssoSignupToken");
      sessionStorage.removeItem("ssoSignupData");
      reset();
      setPasswordConfirm("");
      setSelectedStore(null);
      setIsSsoSignup(false);
      setSignupToken(null);

      toast.success("회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.");
      navigate("/login");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("Signup error:", error.response.data);
        toast.error(error.response.data.message || "회원가입 중 오류가 발생했습니다.");
      } else {
        console.error("Unexpected error:", error);
        toast.error("알 수 없는 오류가 발생했습니다.");
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark pt-[63px] pb-6">
      <div className="w-full max-w-4xl p-4 sm:p-6 lg:p-8 space-y-6 rounded-lg shadow-md bg-white dark:bg-[#292929]">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-primary-light dark:text-primary-dark">
          {isSsoSignup ? "추가 정보 입력" : "회원가입"}
        </h1>
        <form onSubmit={handleSignup} noValidate>
          <div className="grid grid-cols-1 gap-y-6 md:grid-cols-[1fr_auto_1fr] md:gap-x-8">
            {/* --- Left Column --- */}
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="phonelink@example.com"
                  value={userInfo.email || ""}
                  onChange={handleChange}
                  onFocus={handleFocus}
                  disabled={isSsoSignup}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-background-dark dark:border-gray-500 dark:text-white disabled:cursor-not-allowed disabled:opacity-70 dark:disabled:bg-gray-800"
                />
                <p className="h-4 text-xs text-red-500">{errors.email || " "}</p>
              </div>

              {/* Password */}
              {!isSsoSignup && (
                <>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      비밀번호 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={userInfo.password || ""}
                      onChange={handleChange}
                      onBlur={validatePassword}
                      placeholder="영어 / 숫자 / 특수문자 포함 10자 이상"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-background-dark dark:border-gray-500 dark:text-white"
                    />
                    <p className="h-4 text-xs text-red-500">{errors.password || " "}</p>
                  </div>
                  <div>
                    <label
                      htmlFor="passwordConfirm"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      비밀번호 확인 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      id="passwordConfirm"
                      name="passwordConfirm"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      onBlur={validatePasswordConfirm}
                      placeholder="비밀번호 확인"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-background-dark dark:border-gray-500 dark:text-white"
                    />
                    <p className="h-4 text-xs text-red-500">{errors.passwordConfirm || " "}</p>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={userInfo.name || ""}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    disabled={isSsoSignup}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-background-dark dark:border-gray-500 dark:text-white disabled:cursor-not-allowed disabled:opacity-70 dark:disabled:bg-gray-800"
                  />
                  <p className="h-4 text-xs text-red-500">{errors.name || " "}</p>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">성별</label>
                  <div className="grid grid-cols-2">
                    {/* 남성 버튼 */}
                    <label>
                      <input
                        type="radio"
                        name="gender"
                        value="M"
                        checked={userInfo.gender === "M"}
                        onChange={handleChange}
                        onFocus={handleFocus}
                        disabled={isSsoSignup}
                        className="sr-only"
                      />
                      <span
                        className={`w-full h-10 flex items-center justify-center text-sm border rounded-l-md transition-colors duration-200 ${
                          isSsoSignup
                            ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-700 cursor-not-allowed"
                            : userInfo.gender === "M"
                              ? "bg-primary-light text-white border-primary-light dark:bg-primary-dark dark:text-[#292929] dark:border-primary-dark cursor-pointer"
                              : "bg-white text-gray-700 border-gray-300 dark:bg-transparent dark:text-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        }`}
                      >
                        남성
                      </span>
                    </label>

                    {/* 여성 버튼 */}
                    <label>
                      <input
                        type="radio"
                        name="gender"
                        value="F"
                        checked={userInfo.gender === "F"}
                        onChange={handleChange}
                        onFocus={handleFocus}
                        disabled={isSsoSignup}
                        className="sr-only"
                      />
                      <span
                        className={`w-full h-10 flex items-center justify-center text-sm border rounded-r-md transition-colors duration-200 ${
                          isSsoSignup
                            ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-700 cursor-not-allowed"
                            : userInfo.gender === "F"
                              ? "bg-primary-light text-white border-primary-light dark:bg-primary-dark dark:text-[#292929] dark:border-primary-dark cursor-pointer"
                              : "bg-white text-gray-700 border-gray-300 dark:bg-transparent dark:text-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        }`}
                      >
                        여성
                      </span>
                    </label>
                  </div>
                  <p className="h-4 mt-1 text-xs text-red-500">{errors.gender ? errors.gender : <span>&nbsp;</span>}</p>
                </div>
              </div>
            </div>

            {/* --- Divider --- */}
            <div className="hidden md:block w-px bg-background-light dark:bg-background-dark" />

            {/* --- Right Column --- */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Birthday */}
                <div>
                  <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    생년월일
                  </label>
                  <input
                    type="date"
                    id="birthday"
                    name="birthday"
                    value={userInfo.birthday || ""}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    disabled={isSsoSignup}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-background-dark dark:border-gray-500 dark:text-white disabled:cursor-not-allowed disabled:opacity-70 dark:disabled:bg-gray-800"
                  />
                  <p className="h-4 text-xs text-red-500">{errors.birthday || " "}</p>
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    전화번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={userInfo.phoneNumber || ""}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    maxLength={13}
                    placeholder="010-1234-5678"
                    disabled={isSsoSignup}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-background-dark dark:border-gray-500 dark:text-white disabled:cursor-not-allowed disabled:opacity-70 dark:disabled:bg-gray-800"
                  />
                  <p className="h-4 text-xs text-red-500">{errors.phoneNumber || " "}</p>
                </div>
              </div>

              {/* Address */}
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  기본 주소
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={userInfo.address || ""}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-background-dark dark:border-gray-500 dark:text-white"
                  />
                  <AddressSearchButton onAddressComplete={handleAddressComplete} />
                </div>
                <p className="h-4 text-xs text-red-500">{errors.address || " "}</p>
              </div>

              {/* Address Detail */}
              <div>
                <label htmlFor="addressDetail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  상세 주소
                </label>
                <input
                  type="text"
                  id="addressDetail"
                  name="addressDetail"
                  value={userInfo.addressDetail || ""}
                  onChange={handleChange}
                  onFocus={handleFocus}
                  ref={addressDetailRef}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-background-dark dark:border-gray-500 dark:text-white"
                />
                <p className="h-4 text-xs text-red-500">{errors.addressDetail || " "}</p>
              </div>

              {/* Store Selector (Conditional) */}
              {userInfo.role === ROLES.SELLER && (
                <div className="transition-all duration-300 ease-in-out">
                  <label htmlFor="storeId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    소속 매장 <span className="text-red-500">*</span>
                  </label>
                  <StoreSearchableSelect
                    stores={stores}
                    selectedStore={selectedStore}
                    onStoreSelect={handleStoreSelect}
                  />
                  <p className="h-4 mt-1 text-xs text-red-500">
                    {/* {errors.storeId ? errors.storeId : <span>&nbsp;</span>} */}
                    <span>&nbsp;</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Role */}
          <div className="mt-6">
            <div className="flex items-center justify-center">
              <span className="mr-2 text-sm font-medium text-gray-900 dark:text-gray-300 select-none">
                판매자 계정으로 가입을 원할 경우 체크해주세요.
              </span>
              <label htmlFor="role" className="relative cursor-pointer">
                <input
                  id="role"
                  name="role"
                  type="checkbox"
                  className="sr-only peer"
                  checked={userInfo.role === ROLES.SELLER}
                  onChange={handleChange}
                />
                <div className="w-5 h-5 transition-colors duration-200 border-2 border-gray-300 rounded peer-checked:border-primary-light peer-checked:bg-primary-light dark:border-gray-600 dark:peer-checked:border-primary-dark dark:peer-checked:bg-primary-dark"></div>
                <div className="absolute inset-0 flex items-center justify-center text-white opacity-0 pointer-events-none peer-checked:opacity-100 transition-opacity duration-200">
                  <svg
                    className="w-3 h-3"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </label>
            </div>
          </div>

          {userInfo.role === ROLES.SELLER && (
            <p className="mt-2 text-center text-[13.5px] text-red-500">
              판매자 계정 가입인 경우 해당 매장의 관리자의 승인 이후 판매자 권한이 부여됩니다.
            </p>
          )}

          <button
            type="submit"
            className={`w-full px-4 py-2 ${
              userInfo.role === ROLES.SELLER ? "mt-2" : "mt-4"
            } font-bold text-white dark:text-black bg-primary-light rounded-md hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light dark:bg-primary-dark dark:hover:bg-opacity-80`}
          >
            {isSsoSignup ? "가입 완료" : "가입하기"}
          </button>
          <div className="mt-4 text-sm text-center text-gray-500 dark:text-gray-400">
            <span>이미 계정이 있으신가요? </span>
            <Link to="/login" className="font-medium text-primary-light hover:underline dark:text-primary-dark">
              로그인
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;
