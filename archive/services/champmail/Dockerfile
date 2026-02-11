FROM node:20-alpine

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3025

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3025/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start both server and worker
CMD ["sh", "-c", "node dist/workers/email-worker.js & node dist/server.js"]
