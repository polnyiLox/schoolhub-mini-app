FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
ARG VITE_API_BASE_URL=http://localhost:8080/api
ARG VITE_DEMO_MODE=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_DEMO_MODE=$VITE_DEMO_MODE
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
