-- 添加销售人员字段到现有表
-- 这个迁移脚本用于更新现有的数据库表结构

-- 添加销售人员字段
ALTER TABLE form_submissions ADD COLUMN salesperson TEXT;

-- 为现有记录设置默认值
UPDATE form_submissions SET salesperson = '未指定' WHERE salesperson IS NULL;

-- 将字段设置为非空（在设置默认值后）
-- 注意：SQLite 不支持直接修改列约束，所以我们保持字段可为空
-- 但在应用层面确保新记录必须有销售人员信息

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_salesperson ON form_submissions(salesperson);
