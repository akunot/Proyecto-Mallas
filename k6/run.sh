#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

STAGE="${1:-full}"   # smoke | full | stress
BASE_URL="${BASE_URL:-http://localhost:8000}"

echo ":: k6 – Pruebas de carga en rutas públicas"
echo "   Stages:   $STAGE"
echo "   Base URL: $BASE_URL"
echo ""

docker run --rm -i \
  --network=host \
  -e BASE_URL="$BASE_URL" \
  -e STAGES="$STAGE" \
  -v "$SCRIPT_DIR:/scripts" \
  grafana/k6:latest run \
    --summary-trend-stats="min,avg,med,p(90),p(95),p(99),max" \
    /scripts/public-routes.js
