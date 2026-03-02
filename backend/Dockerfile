# 베이스 이미지
FROM node:23-alpine

# 앱 디렉토리 생성
WORKDIR /app

# 패키지 파일 먼저 복사해서 캐시 효율 높이기
COPY backend/package*.json ./

# 의존성 설치
RUN npm ci

# 소스코드 복사
COPY backend/ ./
COPY shared/ ../shared/

# 빌드
RUN npm run build

# 실행 포트
EXPOSE 4000

# 앱 실행
CMD ["node", "dist/server.js"]