FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Main application
FROM node:20-alpine

WORKDIR /app

# Copy backend package files
COPY package*.json ./

# Install backend dependencies
RUN npm ci --omit=dev

# Copy backend source
COPY . .

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/public/dist ./public/dist

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 7777

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:7777/health || exit 1

# Start the service
CMD ["npm", "start"]
