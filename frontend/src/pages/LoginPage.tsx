import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { toast } from "sonner";
import { ssoConfig } from "../config/sso-config";
import Swal from "sweetalert2";
import { useTheme } from "../hooks/useTheme";
import appleLogo from "../assets/images/apple.png";
import googleLogo from "../assets/images/google.png";
import kakaoLogo from "../assets/images/kakao.png";
import naverLogo from "../assets/images/naver.png";
import type { LoginFormData } from "../../../shared/types";
import { SSO_PROVIDERS, type SsoProvider } from "../../../shared/constants";

const ssoProviders = [
  { name: SSO_PROVIDERS.APPLE, logo: appleLogo, alt: "Apple 로그인" },
  { name: SSO_PROVIDERS.GOOGLE, logo: googleLogo, alt: "Google 로그인" },
  { name: SSO_PROVIDERS.KAKAO, logo: kakaoLogo, alt: "Kakao 로그인" },
  { name: SSO_PROVIDERS.NAVER, logo: naverLogo, alt: "Naver 로그인" },
];

const LoginPage: React.FC = () => {
  const [loginData, setLoginData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const { login, isLoading, error: storeError, clearError } = useAuthStore();
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const { theme } = useTheme();

  // 미입력 시 포커스를 주기 위한 ref
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const clearInputErrors = (fieldName: "email" | "password") => {
    if (fieldName === "email" && emailError) setEmailError(false);
    if (fieldName === "password" && passwordError) setPasswordError(false);
    if (errorMessage) setErrorMessage("");
    if (storeError) clearError();
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearError();

    const isEmailEmpty = !loginData.email;
    const isPasswordEmpty = !loginData.password;

    // 애니메이션과 에러 메시지를 위해 상태 초기화
    if (isEmailEmpty) setEmailError(false);
    if (isPasswordEmpty) setPasswordError(false);
    setErrorMessage("");

    if (isEmailEmpty || isPasswordEmpty) {
      setTimeout(() => {
        setEmailError(isEmailEmpty);
        setPasswordError(isPasswordEmpty);

        if (isEmailEmpty && isPasswordEmpty) setErrorMessage("이메일과 비밀번호를 입력해주세요.");
        else if (isEmailEmpty) {
          setErrorMessage("이메일을 입력해주세요.");
        } else {
          setErrorMessage("비밀번호를 입력해주세요.");
        }

        if (isEmailEmpty) {
          emailInputRef.current?.focus();
        } else {
          passwordInputRef.current?.focus();
        }
      }, 0);
      return;
    }

    try {
      const { status, suspendInfo } = await login(loginData);

      if (status === 200 && !suspendInfo) {
        toast.success("로그인 되었습니다.");
        navigate("/");
      } else if (status === 202) {
        toast.success("매장 등록 페이지로 이동합니다.");
        navigate("/store/register");
      } else if (status === 299 && suspendInfo) {
        console.log("정지 데이터", suspendInfo);
        // 정지 해제일 계산 (문자열을 Date 객체로 변환)
        const suspendedUntilDate = new Date(suspendInfo.suspendedUntil);
        const isPermanent = suspendedUntilDate.getTime() >= new Date("9999-12-31").getTime();

        // 정지일과 해제일을 상세한 형태로 포맷팅 (한국 시간대 적용)
        const formatDetailedDate = (dateString: string | Date) => {
          if (typeof dateString === "string" && dateString.includes("T")) {
            // "2025-10-06T17:32:59.000Z" 형태의 문자열을 직접 파싱
            const [datePart, timePart] = dateString.split("T");
            const [year, month, day] = datePart.split("-");

            // 시간 부분에서 초와 밀리초 제거
            const timeOnly = timePart.split(".")[0]; // "17:32:59"
            const [hours, minutes] = timeOnly.split(":");

            return `${year}년 ${month}월 ${day}일 ${hours}시 ${minutes}분`;
          } else {
            // Date 객체인 경우 기존 로직 유지
            const date = typeof dateString === "string" ? new Date(dateString) : dateString;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            return `${year}년 ${month}월 ${day}일 ${hours}시 ${minutes}분`;
          }
        };

        const suspendedDate = formatDetailedDate(suspendInfo.createdAt);
        const releaseDate = isPermanent ? "영구정지" : formatDetailedDate(suspendInfo.suspendedUntil);

        // 다크모드/라이트모드에 따른 스타일 설정
        const isDark = theme === "dark";

        await Swal.fire({
          title: isPermanent ? "영구정지된 계정입니다." : "정지된 계정입니다.",
          html: `
            <div style="
              text-align: left; 
              color: ${isDark ? "#e5e7eb" : "#1f2937"}; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
            ">
              <div style="
                background: ${isDark ? "#292929" : "#f7fafc"}; 
                border: 1px solid ${isDark ? "#666666" : "#e2e8f0"}; 
                border-radius: 8px; 
                padding: 16px; 
                margin: 16px 0;
              ">
                <div style="margin-bottom: 12px;">
                  <strong style="color: ${isDark ? "#9DC183" : "#4F7942"}; display: block; margin-bottom: 4px;">정지 사유:</strong>
                  <span>${suspendInfo.reason}</span>
                </div>
                <div style="margin-bottom: 12px;">
                  <strong style="color: ${isDark ? "#9DC183" : "#4F7942"}; display: block; margin-bottom: 4px;">정지일:</strong>
                  <span>${suspendedDate}</span>
                </div>
                <div>
                  <strong style="color: ${isDark ? "#9DC183" : "#4F7942"}; display: block; margin-bottom: 4px;">해제일:</strong>
                  <span style="color: ${isPermanent ? (isDark ? "#F97171" : "#EF4444") : isDark ? "#68D391" : "#48BB78"};">
                    ${releaseDate}
                  </span>
                </div>
              </div>
              <p style="
                font-size: 14px; 
                color: ${isDark ? "#a0aec0" : "#718096"}; 
                margin: 0;
                text-align: center;
              ">
                문의사항이 있으시면 고객센터로 연락해주세요.
              </p>
            </div>
          `,
          icon: "error",
          confirmButtonText: "확인",
          background: isDark ? "#343434" : "#fff",
          color: isDark ? "#e5e7eb" : "#1f2937",
          confirmButtonColor: isDark ? "#9DC183" : "#4F7942",
        });

        navigate("/");
      }
    } catch (error) {
      console.error("Error logging in:", error);
    }
  };

  // CSRF 공격 방지를 위한 state 값 생성
  const getState = () => {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    const state = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return state;
  };

  const handleSsoLogin = async (provider: SsoProvider) => {
    if (provider === SSO_PROVIDERS.NAVER) {
      const { clientId, redirectUri, authUrl } = ssoConfig.naver;
      const state = getState();
      sessionStorage.setItem("naver_oauth_state", state);
      const naverAuthUrl = `${authUrl}?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
      window.location.href = naverAuthUrl;
    } else if (provider === SSO_PROVIDERS.KAKAO) {
      const { clientId, redirectUri, authUrl } = ssoConfig.kakao;
      const state = getState();
      sessionStorage.setItem("kakao_oauth_state", state);
      const kakaoAuthUrl = `${authUrl}?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
      window.location.href = kakaoAuthUrl;
    } else if (provider === SSO_PROVIDERS.APPLE || provider === SSO_PROVIDERS.GOOGLE) {
      // 애플과 구글 소셜로그인은 아직 지원하지 않음을 알림
      await Swal.fire({
        title: "서비스 준비 중",
        text: "네이버 혹은 카카오 소셜로그인을 이용해주세요.",
        icon: "info",
        confirmButtonText: "확인",
        background: theme === "dark" ? "#343434" : "#fff",
        color: theme === "dark" ? "#e5e7eb" : "#1f2937",
        confirmButtonColor: theme === "dark" ? "#9DC183" : "#4F7942",
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[90vh] bg-background-light dark:bg-background-dark py-12 px-4">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-6 rounded-lg shadow-md bg-white dark:bg-[#292929]">
        <h1 className="text-3xl font-bold text-center text-primary-light dark:text-primary-dark">PhoneLink</h1>
        <form onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                이메일
              </label>
              <input
                ref={emailInputRef}
                type="email"
                id="email"
                name="email"
                value={loginData.email}
                onChange={(e) => {
                  setLoginData({ ...loginData, email: e.target.value });
                  clearInputErrors("email");
                }}
                onFocus={() => clearInputErrors("email")}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-background-dark dark:text-white border-gray-300 dark:border-gray-500 ${
                  emailError ? "animate-shake" : ""
                }`}
                placeholder="이메일을 입력하세요"
              />
            </div>
            <div>
              <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                비밀번호
              </label>
              <input
                ref={passwordInputRef}
                type="password"
                id="password"
                name="password"
                value={loginData.password}
                onChange={(e) => {
                  setLoginData({ ...loginData, password: e.target.value });
                  clearInputErrors("password");
                }}
                onFocus={() => clearInputErrors("password")}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-background-dark dark:text-white border-gray-300 dark:border-gray-500 ${
                  passwordError ? "animate-shake" : ""
                }`}
                placeholder="비밀번호를 입력하세요"
              />
            </div>
          </div>
          <div>
            <p className="text-sm text-red-500 dark:text-red-400 text-center pb-2 h-5 mt-4 mb-2">
              {errorMessage || storeError || " "}
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 font-bold text-white rounded-lg bg-primary-light hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light dark:bg-primary-dark dark:hover:bg-opacity-80 dark:text-[#292929]"
            >
              {isLoading ? "로그인 중..." : "로그인"}
            </button>
          </div>
        </form>
        <div className="text-sm text-center text-gray-500 dark:text-gray-400">
          <span>회원이 아니신가요? </span>
          <Link to="/agreement" className="font-medium text-primary-light hover:underline dark:text-primary-dark">
            회원가입
          </Link>
        </div>

        <div className="relative flex items-center">
          <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
          <span className="flex-shrink mx-4 text-xs text-gray-500 dark:text-gray-400">
            SNS 계정으로 로그인/회원가입
          </span>
          <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
        </div>

        {/* SSO Buttons */}
        <div className="flex justify-center space-x-4">
          {ssoProviders.map((provider) => (
            <button
              key={provider.name}
              onClick={() => handleSsoLogin(provider.name)}
              className="w-14 h-14 flex items-center justify-center border-2 border-none dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <img src={provider.logo} alt={provider.alt} className="w-8 h-8" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
