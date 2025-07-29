# 业务员见客报告系统

一个基于 Next.js + Cloudflare 技术栈的客户拜访报告管理系统，支持表单创建、PDF导出、邮件发送和数据管理功能。

## 🌟 功能特性

- ✅ **表单管理**: 创建和编辑客户拜访报告
- ✅ **查询系统**: 支持随机生成和自定义查询码
- ✅ **PDF导出**: 一键生成专业格式的PDF报告
- ✅ **邮件发送**: 自动发送报告到指定邮箱
- ✅ **数据管理**: 后台管理界面，支持数据导出
- ✅ **响应式设计**: 支持桌面和移动设备
- ✅ **云端部署**: 基于Cloudflare的无服务器架构

## 🏗️ 技术架构

### 前端
- **Next.js 15**: React框架，支持静态导出
- **TypeScript**: 类型安全的JavaScript
- **Tailwind CSS**: 实用优先的CSS框架
- **React Hook Form**: 表单状态管理
- **Zod**: 数据验证
- **jsPDF + html2canvas**: PDF生成
- **Lucide React**: 图标库

### 后端
- **Cloudflare Worker**: 无服务器计算平台
- **Hono**: 轻量级Web框架
- **Cloudflare D1**: SQLite数据库
- **Cloudflare Pages**: 静态网站托管

## 📦 项目结构

```
cs-report-system/
├── src/                    # 前端源码
│   ├── app/               # Next.js App Router
│   ├── components/        # React组件
│   ├── lib/              # 工具函数
│   └── types/            # TypeScript类型定义
├── worker/               # Cloudflare Worker
│   ├── src/             # Worker源码
│   └── wrangler.toml    # Worker配置
├── .github/             # GitHub Actions
├── schema.sql           # 数据库结构
└── deploy.sh           # 部署脚本
```

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- Cloudflare 账户
- Wrangler CLI

### 本地开发

1. **克隆项目**
```bash
git clone <repository-url>
cd cs-report-system
```

2. **安装依赖**
```bash
npm install
```

3. **启动开发服务器**
```bash
npm run dev
```

4. **启动Worker开发环境**
```bash
cd worker
npm install
npm run dev
```

### 部署到生产环境

#### 🏗️ 部署架构
- **前端 (Pages)**: 通过GitHub Actions自动部署
- **后端 (Worker)**: 通过wrangler CLI手动部署

#### 1. 前端自动部署
推送代码到main分支即可自动部署前端：
```bash
git push origin main
```

需要在GitHub仓库设置中添加以下Secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

#### 2. Worker手动部署
```bash
# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的配置

# 部署Worker
chmod +x deploy.sh
./deploy.sh
```

## 📋 详细部署指南

### 1. 创建Cloudflare资源

#### 创建D1数据库
```bash
cd worker
wrangler d1 create cs-report-db
```

#### 运行数据库迁移
```bash
wrangler d1 execute cs-report-db --file=../schema.sql
```

### 2. 配置Worker

编辑 `worker/wrangler.toml`，更新以下配置：
- `database_id`: 替换为你的D1数据库ID
- `zone_name`: 替换为你的域名
- `pattern`: 替换为你的API路由模式

### 3. 设置环境变量

```bash
cd worker
wrangler secret put EMAIL_API_KEY
# 输入你的邮件服务API密钥
```

### 4. 部署Worker

```bash
wrangler deploy
```

### 5. 构建和部署前端

```bash
npm run build
wrangler pages deploy out --project-name=cs-report-system
```

## 🎯 使用指南

### 创建报告
1. 访问系统首页
2. 点击"新建报告"
3. 填写表单信息
4. 可选择自定义查询码
5. 点击"保存表单"

### 查询报告
1. 点击"查询报告"
2. 输入查询码
3. 点击"查询"查看结果

### 导出PDF
1. 在表单页面点击"导出PDF"
2. 系统自动生成PDF文件
3. 文件名格式：`公司名称_日期.pdf`

### 发送邮件
1. 在表单页面点击"发送邮件"
2. 输入收件人邮箱
3. 系统自动发送包含PDF附件的邮件

### 管理后台
1. 访问 `/admin` 页面
2. 查看所有表单记录
3. 支持搜索和筛选
4. 可导出Excel格式数据

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证

## 📞 支持

如有问题或建议，请创建 Issue 或联系开发团队。
