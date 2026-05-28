#!/bin/bash
# rollback.sh — 回退到指定版本
# 用法: ./rollback.sh <tag>
# 範例: ./rollback.sh v1.0.0-schedule-auto

set -e

if [ -z "$1" ]; then
  echo "❌ 請指定要回退的版本 tag"
  echo "用法: ./rollback.sh <tag>"
  echo "可用版本:"
  git tag
  exit 1
fi

VERSION=$1
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🔄 正在回退到 $VERSION ..."

# 確認 tag 存在
if ! git -C "$PROJECT_DIR" rev-parse "$VERSION" >/dev/null 2>&1; then
  echo "❌ 版本 $VERSION 不存在"
  exit 1
fi

# stash 未提交的改動
git -C "$PROJECT_DIR" stash --include-untracked 2>/dev/null || true

# 切換到指定版本
git -C "$PROJECT_DIR" checkout "$VERSION" -- .

# 重新安裝依賴 + build
echo "📦 重新安裝依賴..."
cd "$PROJECT_DIR" && npm install --silent

echo "🔨 重新 build..."
cd "$PROJECT_DIR" && npm run build

echo "✅ 已回退到 $VERSION"
echo "請重新啟動 server: node server.js"
