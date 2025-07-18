@echo off
echo 🚀 启动业务员见客报告系统开发环境...

REM 检查Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 请先安装 Node.js
    pause
    exit /b 1
)

REM 检查npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 请先安装 npm
    pause
    exit /b 1
)

REM 安装依赖
echo 📦 安装前端依赖...
call npm install

REM 启动前端开发服务器
echo 🌐 启动前端开发服务器...
start "Frontend Dev Server" cmd /k "npm run dev"

REM 检查是否有wrangler
where wrangler >nul 2>nul
if %errorlevel% equ 0 (
    echo ⚡ 启动Worker开发服务器...
    cd worker
    call npm install
    start "Worker Dev Server" cmd /k "wrangler dev --port 8787"
    cd ..
    
    echo.
    echo ✅ 开发环境启动成功！
    echo.
    echo 📱 前端地址: http://localhost:3000
    echo ⚡ Worker地址: http://localhost:8787
    echo.
    echo 关闭此窗口将停止所有服务
) else (
    echo.
    echo ⚠️  未检测到 wrangler CLI
    echo 📱 前端地址: http://localhost:3000
    echo 💡 要启动Worker开发服务器，请安装wrangler: npm install -g wrangler
    echo.
    echo 关闭此窗口将停止前端服务
)

pause
