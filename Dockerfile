# Use a specific Node version that satisfies package engine requirements
FROM node:24-bullseye AS builder

WORKDIR /app
ARG MODE=dev
ARG NEXT_PUBLIC_API_BASE_URL
ARG BUILD_VERSION=dev-local
ARG NEXT_PUBLIC_APP_BUILD_VERSION
ARG NEXT_PUBLIC_APP_VERSION

# Install yarn via corepack and install dependencies
COPY package.json yarn.lock* ./
# Use a specific Yarn v4 version to avoid Corepack auto-migration
RUN corepack enable && corepack prepare yarn@1.22.19 --activate
# Use classic Yarn to match the v1 lockfile and avoid migration during CI build
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; else yarn install; fi

# Copy source and build
COPY . .
RUN if [ -z "$NEXT_PUBLIC_API_BASE_URL" ]; then \
      if [ "$MODE" = "prod" ]; then \
        NEXT_PUBLIC_API_BASE_URL="https://api.lumio.edu.vn"; \
      else \
        NEXT_PUBLIC_API_BASE_URL="http://localhost:9000"; \
      fi; \
    fi && \
    PACKAGE_VERSION="$(node -p "require('./package.json').version")" && \
    NEXT_PUBLIC_APP_VERSION="v$PACKAGE_VERSION" && \
    if [ -z "$NEXT_PUBLIC_APP_BUILD_VERSION" ]; then \
      NEXT_PUBLIC_APP_BUILD_VERSION="$BUILD_VERSION"; \
    fi && \
    echo "Building with NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL" && \
    echo "Building with NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION" && \
    echo "Building with NEXT_PUBLIC_APP_BUILD_VERSION=$NEXT_PUBLIC_APP_BUILD_VERSION" && \
    export NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL" && \
    export NEXT_PUBLIC_APP_VERSION="$NEXT_PUBLIC_APP_VERSION" && \
    export NEXT_PUBLIC_APP_BUILD_VERSION="$NEXT_PUBLIC_APP_BUILD_VERSION" && \
    yarn build

# Production image
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built assets and production node_modules from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

# Use the Next.js built-in start command
CMD ["yarn", "start"]
