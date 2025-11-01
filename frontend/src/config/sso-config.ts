// Vite 환경 변수를 안전하게 가져오는 헬퍼 함수
const getEnv = (key: string): string => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Vite 환경 변수 ${key}가 설정되지 않았습니다.`);
  }
  return value;
};

// SSO 프로바이더별 공개 설정 객체
export const ssoConfig = {
  // 네이버 공식문서: https://developers.naver.com/docs/login/devguide/devguide.md
  naver: {
    clientId: getEnv("VITE_NAVER_CLIENT_ID"),
    redirectUri: getEnv("VITE_NAVER_REDIRECT_URI"),
    authUrl: "https://nid.naver.com/oauth2.0/authorize",
  },
  // 카카오 공식문서: https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api
  kakao: {
    clientId: getEnv("VITE_KAKAO_CLIENT_ID"),
    redirectUri: getEnv("VITE_KAKAO_REDIRECT_URI"),
    authUrl: "https://kauth.kakao.com/oauth/authorize",
  },
  // TODO: 추후 kakao, google, apple 등 다른 프로바이더 설정 추가
};

// http://phonelink.k8s.bumgu.com/auth/callback/kakao
// http://phonelink.k8s.bumgu.com/social-link/kakao/callback
// https://phonelink.k8s.bumgu.com/auth/callback/kakao
// https://phonelink.k8s.bumgu.com/social-link/kakao/callback

// http://localhost:5173/auth/callback/kakao
// http://localhost:5173/social-link/kakao/callback

//http://localhost:5173/auth/callback/kakao?
// code=ekw2faYrFdep8bja_37Hk1aBxGb2RlrSORntiLRUqpmudQ9EhTjwVwAAAAQKDRmQAAABmj3JfAqoblpFv_zasg
// state=ff773dc7641c1c22cfdef2bfc12b8adf
