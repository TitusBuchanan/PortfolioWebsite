# ============================================================
# Stage 1: Install dependencies
# ============================================================
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline && npm cache clean --force

# ============================================================
# Stage 2: Build the application
# ============================================================
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ============================================================
# Stage 3: Run tests (used in CI, not carried to production)
# ============================================================
FROM build AS test

RUN npm run lint && npm run test:unit -- --coverage

# ============================================================
# Stage 4: Production image — minimal footprint
# ============================================================
FROM gcr.io/distroless/nodejs20-debian12 AS production

LABEL maintainer="platform-team@example.com"
LABEL org.opencontainers.image.source="https://github.com/org/jenkins-cicd-app"

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER 1000

CMD ["dist/server.js"]
