#!/bin/bash

# 开发环境启动脚本

echo "🚀 启动业务员见客报告系统开发环境..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 请先安装 Node.js"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ 请先安装 npm"
    exit 1
fi

# 安装依赖
echo "📦 安装前端依赖..."
npm install

# 启动前端开发服务器
echo "🌐 启动前端开发服务器..."
npm run dev &
FRONTEND_PID=$!

# 检查是否有wrangler
if command -v wrangler &> /dev/null; then
    echo "⚡ 启动Worker开发服务器..."
    cd worker
    npm install
    wrangler dev --port 8787 &
    WORKER_PID=$!
    cd ..
    
    echo ""
    echo "✅ 开发环境启动成功！"
    echo ""
    echo "📱 前端地址: http://localhost:3000"
    echo "⚡ Worker地址: http://localhost:8787"
    echo ""
    echo "按 Ctrl+C 停止所有服务"
    
    # 等待用户中断
    trap "echo '🛑 停止服务...'; kill $FRONTEND_PID $WORKER_PID 2>/dev/null; exit" INT
    wait
else
    echo ""
    echo "⚠️  未检测到 wrangler CLI"
    echo "📱 前端地址: http://localhost:3000"
    echo "💡 要启动Worker开发服务器，请安装wrangler: npm install -g wrangler"
    echo ""
    echo "按 Ctrl+C 停止前端服务"
    
    # 等待用户中断
    trap "echo '🛑 停止服务...'; kill $FRONTEND_PID 2>/dev/null; exit" INT
    wait
fi
