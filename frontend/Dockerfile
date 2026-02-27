FROM node:24-alpine
WORKDIR /app

# 패키지 파일 먼저 복사해서 캐시 효율 높이기
COPY frontend/package*.json ./
RUN npm install

# 나머지 소스코드 복사
COPY frontend/ ./

# 프론트엔드 환경변수(.env)가 복사된 후 빌드 진행
RUN npm run build

# 실행 포트 (예: 80)
EXPOSE 80
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "80"]
