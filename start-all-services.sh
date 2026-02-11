#!/bin/bash

echo "🚀 Starting DeepKit Services in Phases"
echo "======================================"

# Phase 1: Infrastructure
echo -e "\n📦 Phase 1: Starting Infrastructure..."
docker compose up -d
sleep 10

# Phase 2: Hub
echo -e "\n🎯 Phase 2: Starting Hub..."
docker compose -f docker-compose.yml -f modules/hub.yml up -d --build
sleep 5

# Phase 3: Existing Services (built previously)
echo -e "\n🔧 Phase 3: Starting Existing Services..."
docker compose -f docker-compose.yml \
  -f modules/qr-generator.yml \
  -f modules/link-shortener.yml \
  -f modules/utm-tracker.yml \
  -f modules/request-tracker.yml \
  -f modules/deepkit-forms.yml \
  -f modules/deepkit-brain.yml \
  -f modules/deepkit-dock.yml \
  up -d --build
sleep 10

# Phase 4: Expansion Tools - Batch 1 (Simple services)
echo -e "\n✨ Phase 4: Starting Expansion Tools - Batch 1..."
docker compose -f docker-compose.yml \
  -f modules/api-testing.yml \
  -f modules/password-manager.yml \
  up -d --build
sleep 10

# Phase 5: Expansion Tools - Batch 2 (PostgreSQL services)
echo -e "\n✨ Phase 5: Starting Expansion Tools - Batch 2..."
docker compose -f docker-compose.yml \
  -f modules/calendar.yml \
  -f modules/time-tracker.yml \
  -f modules/task-tracker.yml \
  up -d --build
sleep 10

# Phase 6: Expansion Tools - Batch 3 (Complex services)
echo -e "\n✨ Phase 6: Starting Expansion Tools - Batch 3..."
docker compose -f docker-compose.yml \
  -f modules/file-manager.yml \
  -f modules/webhook-manager.yml \
  -f modules/invoicing.yml \
  up -d --build
sleep 10

# Phase 7: Marketing & Admin
echo -e "\n✨ Phase 7: Starting Marketing & Admin..."
docker compose -f docker-compose.yml \
  -f modules/marketing360.yml \
  -f modules/super-admin.yml \
  -f modules/champmail.yml \
  up -d --build
sleep 5

echo -e "\n✅ All services started!"
echo -e "\n📊 Container Status:"
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"

echo -e "\n🎯 Hub: http://localhost:7777"
