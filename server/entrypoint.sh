#!/bin/sh
set -e

# Prismaマイグレーション自動適用
echo "Prismaマイグレーション実行中..."
npx prisma migrate deploy
echo "マイグレーション完了"

exec node dist/server.js
