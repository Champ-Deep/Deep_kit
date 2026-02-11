# DeepKit Core - COMMAND CENTER
# Port 7777 (THE FACE range)

FROM node:18-alpine

# Create non-root user
RUN addgroup -g 10000 deepkit && \
    adduser -D -u 10000 -G deepkit deepkit

WORKDIR /app

# Copy and install backend dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy backend source
COPY --chown=deepkit:deepkit src/ ./src/
COPY --chown=deepkit:deepkit sql/ ./sql/

# Copy pre-built frontend
COPY --chown=deepkit:deepkit public/ ./public/

# Create uploads directory
RUN mkdir -p /app/uploads && chown deepkit:deepkit /app/uploads

USER deepkit

EXPOSE 7777

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:7777/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "src/index.js"]
