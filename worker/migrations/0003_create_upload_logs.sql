-- 创建上传日志表
CREATE TABLE IF NOT EXISTS upload_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  upload_path TEXT NOT NULL,
  server_url TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  company_name TEXT,
  contact_person TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_upload_logs_form_id ON upload_logs(form_id);
CREATE INDEX IF NOT EXISTS idx_upload_logs_uploaded_at ON upload_logs(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_upload_logs_company_name ON upload_logs(company_name);
