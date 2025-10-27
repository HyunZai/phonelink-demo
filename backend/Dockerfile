# Stage 1: Build
FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package-lock.json ./backend/

RUN npm install
RUN npm install --prefix backend

COPY . .

RUN npm run build --prefix backend

# --- Stage 2: Production ---
FROM node:24-alpine

WORKDIR /app

LABEL org.opencontainers.image.source=https://github.com/phone-link-org/phone-link

COPY --from=build /app/backend/package.json /app/package.json
COPY --from=build /app/backend/package-lock.json /app/package-lock.json
RUN npm install --omit=dev

COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/uploads ./uploads/

EXPOSE 4000

CMD ["node", "dist/backend/src/server.js"]
