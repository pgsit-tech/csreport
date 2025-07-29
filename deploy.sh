#!/bin/bash

# CS Report System Worker 部署脚本
# 用于本地部署Worker到Cloudflare
# 注意：前端通过GitHub Actions自动部署，此脚本仅用于Worker部署

set -e

echo "⚡ 开始部署 CS Report System Worker..."

# 检查必要的工具
command -v wrangler >/dev/null 2>&1 || { echo "❌ 请先安装 wrangler CLI"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ 请先安装 Node.js 和 npm"; exit 1; }

echo "ℹ️  前端部署说明："
echo "   前端通过GitHub Actions自动部署到Cloudflare Pages"
echo "   推送到main分支后会自动触发部署"
echo ""

# 部署 Worker
echo "⚡ 部署 Cloudflare Worker..."
cd worker
npm install

# 创建 D1 数据库（如果不存在）
echo "🗄️ 设置数据库..."
wrangler d1 create cs-report-db || echo "数据库可能已存在"

# 运行数据库迁移
echo "📊 运行数据库迁移..."
wrangler d1 execute cs-report-db --file=../schema.sql

# 部署 Worker
echo "🚀 部署 Worker..."
wrangler deploy

cd ..

echo "✅ Worker 部署完成！"
echo ""
echo "📋 部署状态："
echo "✅ Worker: 已通过wrangler部署"
echo "🔄 前端: 通过GitHub Actions自动部署"
echo ""
echo "📋 后续步骤："
echo "1. 在 Cloudflare Dashboard 中配置域名"
echo "2. 设置环境变量："
echo "   - EMAIL_API_KEY: 邮件服务API密钥"
echo "   - FROM_EMAIL: 发送邮件的地址"
echo "3. 配置 DNS 记录指向 Pages 和 Worker"
echo "4. 推送代码到GitHub触发前端自动部署"
echo "5. 测试所有功能是否正常工作"
echo ""
echo "🔗 有用的链接："
echo "- Cloudflare Dashboard: https://dash.cloudflare.com"
echo "- Pages 项目: https://dash.cloudflare.com/pages"
echo "- Workers 项目: https://dash.cloudflare.com/workers"
echo "- D1 数据库: https://dash.cloudflare.com/d1"
