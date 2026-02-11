# DeepKit Messenger - THE COMMAND CENTER
# Port 7777 (THE FACE - Command Center)

FROM node:20-alpine

# Create non-root user (use higher GID/UID to avoid conflicts)
RUN addgroup -g 10000 deepkit && \
    adduser -D -u 10000 -G deepkit deepkit

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy backend source
COPY --chown=deepkit:deepkit src/ ./src/
COPY --chown=deepkit:deepkit sql/ ./sql/

# Copy pre-built frontend
COPY --chown=deepkit:deepkit public/ ./public/

# Create uploads directory
RUN mkdir -p /app/uploads && chown deepkit:deepkit /app/uploads

# Switch to non-root user
USER deepkit

# Expose port
EXPOSE 7777

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:7777/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start command
CMD ["node", "src/index.js"]
