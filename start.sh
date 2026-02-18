#!/bin/bash
# start both frontend and backend for dev
# usage: ./start.sh

echo "starting tipx..."
echo "frontend: http://localhost:7300"
echo "backend:  http://localhost:7301"
echo ""

rm -rf ./.next/

npx concurrently \
  --names "next,api" \
  --prefix-colors "cyan,yellow" \
  "npx next dev --hostname 127.0.0.1 -p 7300" \
  "node server/index.js"
