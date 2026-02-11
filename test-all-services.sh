#!/bin/bash

echo "🧪 Testing All DeepKit Services"
echo "================================"

# Service definitions with ports
declare -A SERVICES=(
  ["Hub"]=7777
  ["QR Generator"]=3010
  ["Link Shortener"]=3011
  ["UTM Tracker"]=3007
  ["Request Tracker"]=3008
  ["DeepKit Forms"]=3009
  ["DeepKit Brain"]=11500
  ["DeepKit Dock"]=7778
  ["API Testing"]=3017
  ["Calendar"]=3014
  ["Time Tracker"]=3019
  ["File Manager"]=3020
  ["Task Tracker"]=3018
  ["Password Manager"]=3016
  ["Marketing 360"]=3012
  ["Webhook Manager"]=3021
  ["Invoicing"]=3015
  ["Super Admin"]=3022
  ["ChampMail"]=3025
)

echo -e "\nChecking health endpoints...\n"

for service in "${!SERVICES[@]}"; do
  port="${SERVICES[$service]}"
  printf "%-20s (:%d) " "$service" "$port"

  response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "http://localhost:$port/health" 2>/dev/null)

  if [ "$response" = "200" ]; then
    echo "✅ HEALTHY"
  elif [ "$response" = "000" ]; then
    echo "❌ OFFLINE"
  else
    echo "⚠️  HTTP $response"
  fi
done

echo -e "\n📊 Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo -e "\n🎯 Access Points:"
echo "   Hub:           http://localhost:7777"
echo "   Super Admin:   http://localhost:3022"
echo "   Marketing 360: http://localhost:3012"
echo "   Calendar:      http://localhost:3014"
echo "   Tasks:         http://localhost:3018"
echo "   Time Tracker:  http://localhost:3019"
echo "   API Testing:   http://localhost:3017"
echo "   File Manager:  http://localhost:3020"
echo "   Invoicing:     http://localhost:3015"
echo "   Password Mgr:  http://localhost:3016"
