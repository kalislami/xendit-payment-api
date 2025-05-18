#!/bin/sh
set -e

cp -r src/generated dist/generated

# jalankan migrasi (hanya apply, tanpa interaktif)
npx prisma migrate deploy

# start server (sesuaikan path file start)
node dist/server.js
