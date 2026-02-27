FROM node:24-alpine
WORKDIR /app

# 패키지 파일 먼저 복사해서 캐시 효율 높이기
COPY backend/package*.json ./
RUN npm install

# 나머지 소스코드 복사
COPY backend/ ./

# 빌드
RUN npm run build

# 실행 포트 (예: 4000)
EXPOSE 4000
CMD ["npm", "start"]
