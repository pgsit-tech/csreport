# 部署指南

本文档详细说明如何将业务员见客报告系统部署到Cloudflare平台。

## 🏗️ 部署架构

### 部署方式说明

- **前端 (Pages)**: 通过GitHub Actions自动部署到Cloudflare Pages
- **后端 (Worker)**: 通过wrangler CLI手动部署到Cloudflare Workers

### 自动化流程

1. 推送代码到GitHub main分支
2. GitHub Actions自动构建并部署前端到Pages
3. Worker需要手动使用wrangler部署

## 📋 部署前准备

### 1. 账户和工具
- Cloudflare 账户
- GitHub 账户
- Node.js 18+ 和 npm
- Wrangler CLI: `npm install -g wrangler`

### 2. 域名准备
- 准备一个域名并添加到Cloudflare
- 确保DNS已正确配置

## 🚀 部署步骤

### 第一步：创建Cloudflare资源

#### 1.1 创建D1数据库
```bash
cd worker
wrangler d1 create cs-report-db
```

记录返回的数据库ID，更新 `worker/wrangler.toml` 中的 `database_id`。

#### 1.2 运行数据库迁移
```bash
wrangler d1 execute cs-report-db --file=../schema.sql
```

### 第二步：配置Worker

#### 2.1 更新wrangler.toml
编辑 `worker/wrangler.toml`：
```toml
name = "cs-report-worker"
main = "src/index.ts"
compatibility_date = "2024-01-15"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "cs-report-db"
database_id = "your-actual-database-id"  # 替换为实际ID

[vars]
FROM_EMAIL = "noreply@your-domain.com"  # 替换为你的邮箱

[[routes]]
pattern = "your-domain.com/api/*"  # 替换为你的域名
zone_name = "your-domain.com"      # 替换为你的域名
```

#### 2.2 设置环境变量
```bash
cd worker
wrangler secret put EMAIL_API_KEY
# 输入你的邮件服务API密钥（如Mailgun、SendGrid等）
```

#### 2.3 部署Worker
```bash
wrangler deploy
```

### 第三步：配置前端

#### 3.1 更新API配置
编辑 `src/lib/config.ts`，将Worker域名替换为实际域名：
```typescript
export const API_CONFIG = {
  baseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://your-actual-worker-domain.workers.dev'  // 替换为实际域名
    : '',
  // ...
};
```

#### 3.2 构建前端
```bash
npm run build
```

### 第四步：部署到Cloudflare Pages

#### 4.1 通过Wrangler部署
```bash
wrangler pages deploy out --project-name=cs-report-system
```

#### 4.2 或通过GitHub集成
1. 将代码推送到GitHub仓库
2. 在Cloudflare Dashboard中创建Pages项目
3. 连接GitHub仓库
4. 设置构建配置：
   - 构建命令: `npm run build`
   - 输出目录: `out`
   - Node.js版本: `18`

### 第五步：配置域名和DNS

#### 5.1 Pages域名
在Cloudflare Dashboard的Pages项目中：
1. 进入"Custom domains"
2. 添加你的域名
3. 按照提示配置DNS记录

#### 5.2 Worker路由
在Cloudflare Dashboard的Workers项目中：
1. 进入"Triggers"标签
2. 添加自定义域名路由
3. 设置路由模式：`your-domain.com/api/*`

## 🔧 邮件服务配置

### Mailgun配置
1. 注册Mailgun账户
2. 验证域名
3. 获取API密钥
4. 更新Worker中的邮件发送代码

### SendGrid配置
1. 注册SendGrid账户
2. 创建API密钥
3. 验证发送域名
4. 更新Worker中的邮件发送代码

## 🔍 验证部署

### 1. 功能测试
- [ ] 访问主页面
- [ ] 创建新报告
- [ ] 查询报告
- [ ] 导出PDF
- [ ] 发送邮件
- [ ] 管理后台

### 2. 性能测试
- [ ] 页面加载速度
- [ ] API响应时间
- [ ] PDF生成速度

## 🛠️ 故障排除

### 常见问题

**Q: Worker部署失败**
A: 检查wrangler.toml配置，确保数据库ID正确

**Q: 前端无法连接API**
A: 检查CORS配置和API URL配置

**Q: 邮件发送失败**
A: 检查邮件服务配置和API密钥

**Q: 数据库连接失败**
A: 确认数据库迁移已执行，检查绑定配置

### 日志查看
```bash
# 查看Worker日志
wrangler tail

# 查看Pages构建日志
# 在Cloudflare Dashboard中查看
```

## 📊 监控和维护

### 1. 设置监控
- 在Cloudflare Analytics中查看流量
- 设置Worker的错误告警
- 监控数据库使用情况

### 2. 定期维护
- 定期备份数据库
- 更新依赖包
- 检查安全更新

## 🔒 安全配置

### 1. API安全
- 设置适当的CORS策略
- 实施速率限制
- 验证输入数据

### 2. 数据安全
- 定期备份数据
- 设置访问控制
- 加密敏感数据

## 📈 性能优化

### 1. 缓存策略
- 设置适当的缓存头
- 使用Cloudflare缓存
- 优化静态资源

### 2. 数据库优化
- 创建适当的索引
- 优化查询语句
- 定期清理数据

---

## 🆘 获取帮助

如果遇到问题：
1. 查看Cloudflare文档
2. 检查GitHub Issues
3. 联系技术支持

部署完成后，记得更新README.md中的域名信息！
