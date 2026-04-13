# Multi-stage build for optimized frontend image
# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /build

# Install dependencies with retries
COPY package*.json ./
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm install --no-audit --no-fund

# Copy source code
COPY . .

# Build React application
RUN npm run build

# Stage 2: Runtime - Nginx server for production-like serving
FROM nginx:alpine

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder
COPY --from=builder /build/build /usr/share/nginx/html

EXPOSE 8080

# Health check
HEALTHCHECK --interval=5s --timeout=3s --retries=3 --start-period=10s \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
