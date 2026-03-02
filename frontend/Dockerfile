# 1단계: 빌드
FROM node:23-alpine AS builder

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
COPY shared/ ../shared/
RUN npm run build

# 2단계: Nginx로 정적 파일 서빙
FROM nginx:alpine

# Vite 빌드 결과물을 Nginx로 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA 라우팅을 위한 Nginx 설정
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]