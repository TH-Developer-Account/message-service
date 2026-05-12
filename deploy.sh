#!/bin/bash
set -e   # exit immediately if any command fails

echo "→ Pulling latest code..."
git pull origin master

echo "→ Building new image..."
docker compose build --no-cache

echo "→ Restarting service..."
docker compose up -d

echo "→ Cleaning up old images..."
docker image prune -f

echo "✓ whatsapp-service deployed"