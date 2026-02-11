# DeepKit Automated Backup Service
FROM alpine:3.18

# Install PostgreSQL client and cron
RUN apk add --no-cache \
    postgresql-client \
    dcron \
    bash \
    gzip

# Create directories
RUN mkdir -p /var/lib/deepkit/backups /var/log

# Copy backup script
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Setup cron job (every 6 hours: 0 */6 * * *)
RUN echo "0 */6 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

# Run immediate backup on container start, then start cron
CMD ["/bin/sh", "-c", "/usr/local/bin/backup.sh && crond -f -l 2"]
