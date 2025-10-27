# Stage 1: Build the React application
FROM node:24-alpine AS build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:1.21-alpine

LABEL org.opencontainers.image.source=https://github.com/phone-link-org/phone-link

COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Copy the nginx config file
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
