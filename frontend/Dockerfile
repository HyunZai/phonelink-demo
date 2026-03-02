# 1단계: 빌드
FROM node:23-alpine AS builder

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
COPY shared/ ../shared/

# 빌드 타임 환경변수
ARG VITE_API_URL
ARG VITE_NAVER_CLIENT_ID
ARG VITE_KAKAO_CLIENT_ID
ARG VITE_NAVER_REDIRECT_URI
ARG VITE_KAKAO_REDIRECT_URI

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_NAVER_CLIENT_ID=$VITE_NAVER_CLIENT_ID
ENV VITE_KAKAO_CLIENT_ID=$VITE_KAKAO_CLIENT_ID
ENV VITE_NAVER_REDIRECT_URI=$VITE_NAVER_REDIRECT_URI
ENV VITE_KAKAO_REDIRECT_URI=$VITE_KAKAO_REDIRECT_URI

RUN npm run build

# 2단계: Nginx로 정적 파일 서빙
FROM nginx:alpine

# Vite 빌드 결과물을 Nginx로 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA 라우팅을 위한 Nginx 설정
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]