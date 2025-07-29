-- Cloudflare D1 数据库schema
-- 业务员见客报告表单数据表

CREATE TABLE IF NOT EXISTS form_submissions (
  id TEXT PRIMARY KEY,
  query_code TEXT UNIQUE NOT NULL,
  custom_query_code TEXT,
  
  -- 基本信息
  company_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  
  -- 联系人信息
  contact_person TEXT NOT NULL,
  mobile TEXT NOT NULL,
  wechat TEXT,
  
  -- 公司详情
  company_size TEXT NOT NULL,
  office_size TEXT NOT NULL,
  
  -- 业务信息
  main_business TEXT NOT NULL,
  products TEXT NOT NULL,
  service_needs TEXT NOT NULL,
  salesperson TEXT NOT NULL,
  chat_records TEXT,

  -- 系统字段
  report_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_query_code ON form_submissions(query_code);
CREATE INDEX IF NOT EXISTS idx_custom_query_code ON form_submissions(custom_query_code);
CREATE INDEX IF NOT EXISTS idx_company_name ON form_submissions(company_name);
CREATE INDEX IF NOT EXISTS idx_created_at ON form_submissions(created_at);

-- 邮件发送记录表
CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  
  FOREIGN KEY (form_id) REFERENCES form_submissions(id)
);

CREATE INDEX IF NOT EXISTS idx_email_logs_form_id ON email_logs(form_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- 上传日志表
CREATE TABLE IF NOT EXISTS upload_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  form_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  upload_path TEXT NOT NULL,
  server_url TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  company_name TEXT,
  contact_person TEXT
);

CREATE INDEX IF NOT EXISTS idx_upload_logs_form_id ON upload_logs(form_id);
CREATE INDEX IF NOT EXISTS idx_upload_logs_uploaded_at ON upload_logs(uploaded_at);

-- Nextcloud配置表
CREATE TABLE IF NOT EXISTS nextcloud_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  server_url TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  upload_path TEXT NOT NULL DEFAULT '/CS Report',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 管理员设置表
CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  username TEXT NOT NULL DEFAULT 'admin',
  email TEXT NOT NULL DEFAULT 'admin@example.com',
  system_name TEXT NOT NULL DEFAULT '业务员见客报告系统',
  password_hash TEXT NOT NULL DEFAULT 'admin123', -- 实际应用中应该使用哈希
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
