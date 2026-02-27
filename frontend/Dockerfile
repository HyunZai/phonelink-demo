FROM node:24-alpine
WORKDIR /app

# 패키지 파일 먼저 복사해서 캐시 효율 높이기
COPY frontend/package*.json ./
RUN npm install

# 나머지 소스코드 복사
COPY frontend/ ./

# 도커 컴포즈로부터 빌드 아규먼트 받기
ARG VITE_API_URL
ARG VITE_NAVER_CLIENT_ID
ARG VITE_KAKAO_CLIENT_ID
ARG VITE_NAVER_REDIRECT_URI
ARG VITE_KAKAO_REDIRECT_URI

# 빌드 타임 환경변수(Vite)로 세팅
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_NAVER_CLIENT_ID=$VITE_NAVER_CLIENT_ID
ENV VITE_KAKAO_CLIENT_ID=$VITE_KAKAO_CLIENT_ID
ENV VITE_NAVER_REDIRECT_URI=$VITE_NAVER_REDIRECT_URI
ENV VITE_KAKAO_REDIRECT_URI=$VITE_KAKAO_REDIRECT_URI

# 프론트엔드 빌드 진행 (이때 ENV 값들이 정적 파일로 다 구워짐)
RUN npm run build

# 실행 포트 (예: 80)
EXPOSE 80
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "80"]
