import React, { useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "../store/authStore";
import { SSO_PROVIDERS, type SsoProvider } from "../../../shared/constants";
import Swal from "sweetalert2";
import { useTheme } from "../hooks/useTheme";

const SsoCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleSocialLoginCallback } = useAuthStore();
  const { provider } = useParams<{ provider: SsoProvider }>(); // URL로부터 provider 동적 추출
  const { theme } = useTheme();

  const effectRan = useRef(false);

  useEffect(() => {
    if (effectRan.current === true) return;
    effectRan.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!provider) {
      toast.error("잘못된 접근입니다. (SSO Provider 없음)");
      navigate("/login");
      return;
    }

    // state 값 검증
    if (provider === SSO_PROVIDERS.NAVER) {
      const storedState = sessionStorage.getItem("naver_oauth_state");
      if (state !== storedState) {
        toast.error("비정상적인 접근입니다.");
        navigate("/login");
        return;
      }
      sessionStorage.removeItem("naver_oauth_state");
    } else if (provider === SSO_PROVIDERS.KAKAO) {
      const storedState = sessionStorage.getItem("kakao_oauth_state");
      if (state !== storedState) {
        toast.error("비정상적인 접근입니다.");
        navigate("/login");
        return;
      }
      sessionStorage.removeItem("kakao_oauth_state");
    }
    // TODO: 다른 프로바이더들의 state/nonce 검증 로직 추가 위치

    if (code) {
      const processLogin = async () => {
        try {
          const result = await handleSocialLoginCallback(provider, code);
          if (result.type === "LOGIN_SUCCESS") {
            if (result.status === 202) {
              toast.success("등록을 요청하실 매장 정보를 입력해주세요.");
              navigate("/store/register");
            } else {
              toast.success("로그인되었습니다.");
              navigate("/");
            }
          } else if (result.type === "SIGNUP_REQUIRED") {
            // SSO 회원가입: 동의 페이지로 먼저 이동
            // signupToken과 ssoData를 sessionStorage에 임시 저장
            sessionStorage.setItem("ssoSignupToken", result.signupToken);
            sessionStorage.setItem("ssoSignupData", JSON.stringify(result.ssoData));
            toast.info("약관 동의 후 회원가입을 진행해주세요.");
            navigate("/agreement");
          } else if (result.type === "EXISTING_ACCOUNT") {
            await Swal.fire({
              title: "이미 가입된 사용자입니다.",
              text: "로그인 후 마이페이지에서 소셜계정을 연결하세요.",
              icon: "info",
              confirmButtonText: "확인",
              background: theme === "dark" ? "#343434" : "#fff",
              color: theme === "dark" ? "#e5e7eb" : "#1f2937",
              confirmButtonColor: theme === "dark" ? "#9DC183" : "#4F7942",
            });
            window.location.href = "/login";
          } else if (result.type === "SUSPENDED_ACCOUNT") {
            // 정지된 계정 처리 (일반 로그인과 동일한 로직)
            const { suspendInfo } = result;

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
          console.error(`${provider} 로그인 중 오류가 발생했습니다.`, error);
          toast.error("로그인 처리 중 오류가 발생했습니다.");
          window.location.href = "/login";
        }
      };
      processLogin();
      // const sendCodeToBackend = async (authorizationCode: string) => {
      //   try {
      //     const response = await apiClient.post(
      //       `user/auth/callback/${provider}`,
      //       { code: authorizationCode },
      //     );

      //     if (response.status === 200) {
      //       const { isNewUser, user, token, ssoData, signupToken } =
      //         response.data?.data || {};

      //       if (authContext) {
      //         if (isNewUser) {
      //           toast.info("추가 정보를 입력하여 회원가입을 완료해주세요.");
      //           navigate("/signup", { state: { ssoData, signupToken } });
      //         } else {
      //           authContext.login({
      //             userId: user.id.toString(),
      //             nickname: user.nickname,
      //             userType: user.role,
      //             token,
      //           });
      //           toast.success(`${provider} 계정으로 로그인되었습니다.`);
      //           navigate("/");
      //         }
      //       }
      //     } else if (response.status === 202) {
      //       // seller role이지만 매장 등록이 안된 경우
      //       const { user, token } = response.data?.data || {};

      //       if (authContext) {
      //         authContext.login({
      //           userId: user.id.toString(),
      //           nickname: user.nickname,
      //           userType: user.role,
      //           token,
      //         });
      //         toast.info("매장 등록이 필요합니다.");
      //         navigate("/store/register");
      //       }
      //     }
      //   } catch (error) {
      //     console.error(`${provider} 로그인 중 오류가 발생했습니다.`, error);
      //     toast.error("로그인 처리 중 오류가 발생했습니다.");
      //     navigate("/login");
      //   }
      // };

      // sendCodeToBackend(code);
    } else {
      toast.error(`${provider} 인증에 실패했습니다.`);
      navigate("/login");
    }
  }, [searchParams, navigate, provider]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-xl font-semibold">
        {provider ? `${provider} 로그인 처리 중입니다...` : "로그인 처리 중입니다..."}
      </p>
    </div>
  );
};

export default SsoCallbackPage;
