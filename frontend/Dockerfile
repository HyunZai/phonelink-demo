# Stage 1: Build the React application
FROM node:24-alpine AS build
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

COPY . .

ARG VITE_API_URL
ARG VITE_NAVER_CLIENT_ID
ARG VITE_NAVER_REDIRECT_URI
ARG VITE_KAKAO_CLIENT_ID
ARG VITE_KAKAO_REDIRECT_URI

ENV VITE_NAVER_CLIENT_ID=$VITE_NAVER_CLIENT_ID
ENV VITE_KAKAO_CLIENT_ID=$VITE_KAKAO_CLIENT_ID
ENV VITE_NAVER_REDIRECT_URI=$VITE_NAVER_REDIRECT_URI
ENV VITE_KAKAO_REDIRECT_URI=$VITE_KAKAO_REDIRECT_URI
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build --prefix frontend

# ---

# Stage 2: Serve the application with Node (vite preview)
FROM node:24-alpine
WORKDIR /app

# Stage 1('build')의 frontend 디렉터리에서 파일들을 복사
COPY --from=build /app/frontend/package.json ./
COPY --from=build /app/frontend/package-lock.json* ./

# 'vite preview'를 실행하기 위한 의존성 설치
RUN npm install

# vite preview 실행에 필요한 설정 파일들 복사
COPY --from=build /app/frontend/vite.config.ts ./
COPY --from=build /app/frontend/tailwind.config.js ./
COPY --from=build /app/frontend/postcss.config.cjs ./

# 빌드 결과물 복사
COPY --from=build /app/frontend/dist ./dist

# Nginx와 동일하게 80 포트 노출
EXPOSE 3000

# 80 포트로 vite preview 서버 실행
CMD ["npm", "run", "preview", "--", "--port", "3000", "--host", "0.0.0.0"]
