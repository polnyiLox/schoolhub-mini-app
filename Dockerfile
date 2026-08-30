FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
ARG NEXT_PUBLIC_DEMO_MODE=false
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production HOME=/app
WORKDIR /app
RUN addgroup --system --gid 10001 app \
    && adduser --system --uid 10001 --ingroup app app \
    && mkdir -p /app/.config \
    && chown -R app:app /app
COPY --from=dependencies --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/package.json ./package.json
USER app
EXPOSE 3000
CMD ["npm", "run", "start", "--", "--ip", "0.0.0.0", "--port", "3000"]
