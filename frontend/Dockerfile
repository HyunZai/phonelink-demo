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

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Nginx 설정 파일 복사
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Stage 1에서 빌드된 결과물을 Nginx의 서빙 디렉토리로 복사
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
