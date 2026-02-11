#!/bin/bash
set -e

# Task Tracker Database Migration Runner
# Runs SQL migrations against the PostgreSQL database

# Load environment variables
if [ -f "../../.env" ]; then
    source ../../.env
else
    echo "❌ .env file not found. Please create it first."
    exit 1
fi

# PostgreSQL connection details
PGHOST="${POSTGRES_HOST:-deepkit-store}"
PGPORT="${POSTGRES_PORT:-5432}"
PGDATABASE="${POSTGRES_DB:-tasktracker}"
PGUSER="${POSTGRES_USER:-deepkit}"
PGPASSWORD="${POSTGRES_PASSWORD}"

# Export for psql
export PGPASSWORD

echo "🔄 Running Task Tracker Migrations..."
echo "   Host: $PGHOST:$PGPORT"
echo "   Database: $PGDATABASE"
echo ""

# Run migration 001
echo "📋 Applying migration: 001_add_multiuser_and_recurring.sql"

if command -v docker &> /dev/null && docker ps | grep -q deepkit-store; then
    # Running inside Docker environment
    cat 001_add_multiuser_and_recurring.sql | docker exec -i deepkit-store psql -U "$PGUSER" -d "$PGDATABASE"
else
    # Running on host machine
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f 001_add_multiuser_and_recurring.sql
fi

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully"
else
    echo "❌ Migration failed"
    exit 1
fi

# Verify migration
echo ""
echo "🔍 Verifying migration..."
echo "SELECT 'Users: ' || COUNT(*) FROM users; SELECT 'Projects: ' || COUNT(*) FROM projects; SELECT 'Tasks: ' || COUNT(*) FROM tasks;" | \
    docker exec -i deepkit-store psql -U "$PGUSER" -d "$PGDATABASE" 2>/dev/null || \
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE"

echo ""
echo "✅ All migrations applied successfully!"
