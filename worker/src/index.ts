import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { formDataToDbFormat, dbDataToFormFormat, generateQueryCode, generateId } from './utils';

type Bindings = {
  DB: D1Database;
  EMAIL_API_KEY: string;
  FROM_EMAIL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// 简化的 CORS 中间件 - 更宽松的配置
app.use('*', async (c, next) => {
  // 获取请求的 Origin
  const origin = c.req.header('Origin') || '*';

  // 处理预检请求
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
      },
    });
  }

  await next();

  // 为所有响应添加 CORS 头
  c.res.headers.set('Access-Control-Allow-Origin', origin);
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma');
  c.res.headers.set('Access-Control-Allow-Credentials', 'true');
  c.res.headers.set('Vary', 'Origin');
});

// 健康检查端点
app.get('/', async (c) => {
  return c.json({
    success: true,
    message: 'CS Report API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/health', async (c) => {
  return c.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// 提交表单
app.post('/api/submit', async (c) => {
  try {
    const formData = await c.req.json();
    
    // 验证必填字段
    const requiredFields = ['companyName', 'address', 'contactPerson', 'mobile', 'companySize', 'officeSize', 'mainBusiness', 'products', 'serviceNeeds'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        return c.json({ success: false, message: `${field} 是必填字段` }, 400);
      }
    }

    // 转换为数据库格式
    const dbData = formDataToDbFormat(formData);
    
    // 检查自定义查询码是否已存在
    if (dbData.custom_query_code) {
      const existing = await c.env.DB.prepare(
        'SELECT id FROM form_submissions WHERE query_code = ? OR custom_query_code = ?'
      ).bind(dbData.custom_query_code, dbData.custom_query_code).first();
      
      if (existing) {
        return c.json({ success: false, message: '查询码已存在，请使用其他查询码' }, 400);
      }
      dbData.query_code = dbData.custom_query_code;
    } else {
      // 生成唯一的随机查询码
      let queryCode;
      let attempts = 0;
      do {
        queryCode = generateQueryCode();
        const existing = await c.env.DB.prepare(
          'SELECT id FROM form_submissions WHERE query_code = ?'
        ).bind(queryCode).first();
        if (!existing) break;
        attempts++;
      } while (attempts < 10);
      
      if (attempts >= 10) {
        return c.json({ success: false, message: '生成查询码失败，请重试' }, 500);
      }
      dbData.query_code = queryCode;
    }

    // 插入数据库
    await c.env.DB.prepare(`
      INSERT INTO form_submissions (
        id, query_code, custom_query_code, company_name, address, phone, website,
        contact_person, mobile, wechat, company_size, office_size,
        main_business, products, service_needs, salesperson, chat_records,
        report_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      dbData.id, dbData.query_code, dbData.custom_query_code, dbData.company_name,
      dbData.address, dbData.phone, dbData.website, dbData.contact_person,
      dbData.mobile, dbData.wechat, dbData.company_size, dbData.office_size,
      dbData.main_business, dbData.products, dbData.service_needs, dbData.salesperson,
      dbData.chat_records, dbData.report_date, dbData.created_at, dbData.updated_at
    ).run();

    return c.json({
      success: true,
      queryCode: dbData.query_code,
      message: '表单提交成功！'
    });

  } catch (error) {
    console.error('提交表单时出错:', error);
    return c.json({ success: false, message: '服务器错误，请重试' }, 500);
  }
});

// 查询表单
app.get('/api/query', async (c) => {
  try {
    const queryCode = c.req.query('code');

    if (!queryCode) {
      return c.json({ success: false, message: '查询码不能为空' }, 400);
    }

    const result = await c.env.DB.prepare(
      'SELECT * FROM form_submissions WHERE query_code = ? OR custom_query_code = ?'
    ).bind(queryCode, queryCode).first();

    if (!result) {
      return c.json({ success: false, message: '未找到相关记录' }, 404);
    }

    const formData = dbDataToFormFormat(result);

    return c.json({
      success: true,
      data: formData,
      message: '查询成功'
    });

  } catch (error) {
    console.error('查询时出错:', error);
    return c.json({ success: false, message: '服务器错误，请重试' }, 500);
  }
});

// 发送邮件
app.post('/api/send-email', async (c) => {
  try {
    const { to, formData, pdfBuffer } = await c.req.json();

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return c.json({ success: false, message: '邮箱格式不正确' }, 400);
    }

    // 准备邮件内容
    const emailData = {
      from: c.env.FROM_EMAIL,
      to,
      subject: `业务员见客报告 - ${formData.companyName}`,
      html: generateEmailHTML(formData),
      attachments: pdfBuffer ? [{
        filename: `${formData.companyName}_${formData.reportDate}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }] : []
    };

    // 这里应该调用邮件服务API（如Mailgun、SendGrid等）
    // 示例使用Mailgun API
    const response = await fetch('https://api.mailgun.net/v3/your-domain.com/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${c.env.EMAIL_API_KEY}`)}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (response.ok) {
      // 记录邮件发送日志
      await c.env.DB.prepare(`
        INSERT INTO email_logs (id, form_id, recipient_email, sent_at, status)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        generateId(),
        formData.id,
        to,
        new Date().toISOString(),
        'sent'
      ).run();

      return c.json({ success: true, message: '邮件发送成功！' });
    } else {
      throw new Error('邮件发送失败');
    }

  } catch (error) {
    console.error('发送邮件时出错:', error);
    return c.json({ success: false, message: '邮件发送失败，请重试' }, 500);
  }
});

// 管理接口 - 获取所有表单
app.get('/api/admin/forms', async (c) => {
  try {
    const results = await c.env.DB.prepare(
      'SELECT * FROM form_submissions ORDER BY created_at DESC'
    ).all();

    const forms = results.results.map(dbDataToFormFormat);

    // 计算统计数据
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = {
      totalForms: forms.length,
      todayForms: forms.filter(form => form.createdAt.startsWith(today)).length,
      thisWeekForms: forms.filter(form => new Date(form.createdAt) >= weekAgo).length,
      thisMonthForms: forms.filter(form => new Date(form.createdAt) >= monthAgo).length
    };

    return c.json({
      success: true,
      data: forms,
      stats,
      message: '获取成功'
    });

  } catch (error) {
    console.error('获取表单列表时出错:', error);
    return c.json({ success: false, message: '服务器错误，请重试' }, 500);
  }
});

// 生成单个表单的PDF内容
function generateFormPDF(form: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>客户报告 - ${form.companyName}</title>
  <style>
    body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 20px; line-height: 1.6; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 8px; border-bottom: 1px solid #eee; }
    .label { width: 30%; font-weight: bold; }
    .value { width: 70%; }
  </style>
</head>
<body>
  <div class="header">
    <h1>业务员见客报告</h1>
    <p>查询码: ${form.queryCode}</p>
  </div>

  <div class="section">
    <h2>基本信息</h2>
    <table>
      <tr><td class="label">公司名称:</td><td class="value">${form.companyName}</td></tr>
      <tr><td class="label">地址:</td><td class="value">${form.address}</td></tr>
      <tr><td class="label">电话:</td><td class="value">${form.phone || '-'}</td></tr>
      <tr><td class="label">网站:</td><td class="value">${form.website || '-'}</td></tr>
      <tr><td class="label">公司人数:</td><td class="value">${form.companySize}</td></tr>
      <tr><td class="label">办公室大小:</td><td class="value">${form.officeSize}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>联系人信息</h2>
    <table>
      <tr><td class="label">联系人:</td><td class="value">${form.contactPerson}</td></tr>
      <tr><td class="label">手机:</td><td class="value">${form.mobile}</td></tr>
      <tr><td class="label">微信:</td><td class="value">${form.wechat || '-'}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>业务信息</h2>
    <table>
      <tr><td class="label">主要业务:</td><td class="value">${form.mainBusiness}</td></tr>
      <tr><td class="label">产品:</td><td class="value">${form.products}</td></tr>
      <tr><td class="label">服务需求:</td><td class="value">${form.serviceNeeds}</td></tr>
      <tr><td class="label">负责业务员:</td><td class="value">${form.salesperson || '未指定'}</td></tr>
    </table>
  </div>

  ${form.chatRecords ? `
  <div class="section">
    <h2>聊天记录</h2>
    <div style="background: #f5f5f5; padding: 10px; border-radius: 5px;">
      ${form.chatRecords.replace(/\n/g, '<br>')}
    </div>
  </div>
  ` : ''}

  <div class="section">
    <h2>报告信息</h2>
    <table>
      <tr><td class="label">报告日期:</td><td class="value">${form.reportDate}</td></tr>
      <tr><td class="label">创建时间:</td><td class="value">${new Date(form.createdAt).toLocaleString('zh-CN')}</td></tr>
    </table>
  </div>
</body>
</html>
  `;
}

// 管理接口 - 导出表单（支持批量PDF导出）
app.post('/api/admin/export', async (c) => {
  try {
    const requestData = await c.req.json();
    let forms = [];

    // 支持两种请求格式：
    // 1. { forms: [...] } - 直接传递表单数据
    // 2. { formIds: [...] } - 传递表单ID，需要从数据库查询
    if (requestData.forms) {
      forms = requestData.forms;
    } else if (requestData.formIds && requestData.formIds.length > 0) {
      // 从数据库查询指定的表单
      const placeholders = requestData.formIds.map(() => '?').join(',');
      const query = `SELECT * FROM form_submissions WHERE id IN (${placeholders})`;
      const result = await c.env.DB.prepare(query).bind(...requestData.formIds).all();
      forms = result.results.map(dbDataToFormFormat);
    } else {
      return c.json({ success: false, message: '没有数据可导出' }, 400);
    }

    if (!forms || forms.length === 0) {
      return c.json({ success: false, message: '没有数据可导出' }, 400);
    }

    // 由于Cloudflare Worker的限制，我们无法直接生成真正的PDF和ZIP文件
    // 这里返回一个包含所有表单数据的JSON，前端将处理PDF生成和压缩
    return c.json({
      success: true,
      data: forms,
      message: '数据获取成功，前端将处理PDF生成'
    });

  } catch (error) {
    console.error('导出时出错:', error);
    return c.json({ success: false, message: '导出失败，请重试' }, 500);
  }
});

// 管理接口 - 数据清理（危险操作，需要特殊验证）
app.post('/api/admin/cleanup', async (c) => {
  try {
    const { confirmCode, action } = await c.req.json();

    // 安全验证：需要特殊的确认码
    const expectedCode = 'CLEANUP_CONFIRM_2025';
    if (confirmCode !== expectedCode) {
      return c.json({
        success: false,
        message: '确认码错误，操作被拒绝'
      }, 403);
    }

    let result = { deletedCount: 0, message: '' };

    switch (action) {
      case 'clear_all':
        // 清空所有表单数据
        const deleteFormsResult = await c.env.DB.prepare(
          'DELETE FROM form_submissions'
        ).run();

        result = {
          deletedCount: deleteFormsResult.changes || 0,
          message: `已清理 ${deleteFormsResult.changes || 0} 条表单记录`
        };
        break;

      case 'clear_old':
        // 清理30天前的数据
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffDate = thirtyDaysAgo.toISOString();

        const deleteOldFormsResult = await c.env.DB.prepare(
          'DELETE FROM form_submissions WHERE created_at < ?'
        ).bind(cutoffDate).run();

        result = {
          deletedCount: deleteOldFormsResult.changes || 0,
          message: `已清理 ${deleteOldFormsResult.changes || 0} 条30天前的表单记录`
        };
        break;

      case 'clear_test':
        // 清理测试数据（包含"测试"关键词的数据）
        const deleteTestFormsResult = await c.env.DB.prepare(
          `DELETE FROM form_submissions
           WHERE company_name LIKE '%测试%'
           OR company_name LIKE '%test%'
           OR company_name LIKE '%Test%'
           OR contact_person LIKE '%测试%'
           OR contact_person LIKE '%test%'`
        ).run();

        result = {
          deletedCount: deleteTestFormsResult.changes || 0,
          message: `已清理 ${deleteTestFormsResult.changes || 0} 条测试数据`
        };
        break;

      default:
        return c.json({
          success: false,
          message: '无效的清理操作类型'
        }, 400);
    }

    // 记录清理操作日志
    console.log(`数据清理操作完成: ${action}, 删除记录数: ${result.deletedCount}`);

    return c.json({
      success: true,
      data: result,
      message: '数据清理完成'
    });

  } catch (error) {
    console.error('数据清理时出错:', error);
    return c.json({ success: false, message: '数据清理失败，请重试' }, 500);
  }
});

// 管理接口 - 获取数据库统计信息
app.get('/api/admin/stats', async (c) => {
  try {
    // 获取表单总数
    const totalFormsResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM form_submissions'
    ).first();

    // 获取今日表单数
    const today = new Date().toISOString().split('T')[0];
    const todayFormsResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM form_submissions WHERE DATE(created_at) = ?'
    ).bind(today).first();

    // 获取本周表单数
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekFormsResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM form_submissions WHERE created_at >= ?'
    ).bind(weekAgo.toISOString()).first();

    // 获取本月表单数
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthFormsResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM form_submissions WHERE created_at >= ?'
    ).bind(monthAgo.toISOString()).first();

    // 获取最早和最新的记录时间
    const oldestResult = await c.env.DB.prepare(
      'SELECT MIN(created_at) as oldest FROM form_submissions'
    ).first();

    const newestResult = await c.env.DB.prepare(
      'SELECT MAX(created_at) as newest FROM form_submissions'
    ).first();

    return c.json({
      success: true,
      data: {
        totalForms: totalFormsResult?.count || 0,
        todayForms: todayFormsResult?.count || 0,
        weekForms: weekFormsResult?.count || 0,
        monthForms: monthFormsResult?.count || 0,
        oldestRecord: oldestResult?.oldest,
        newestRecord: newestResult?.newest
      },
      message: '统计信息获取成功'
    });

  } catch (error) {
    console.error('获取统计信息时出错:', error);
    return c.json({ success: false, message: '获取统计信息失败' }, 500);
  }
});

// Nextcloud上传接口
app.post('/api/nextcloud/upload', async (c) => {
  try {
    const { config, fileName, fileContent, formData } = await c.req.json();

    // 验证必要参数
    if (!config.serverUrl || !config.username || !config.password || !fileName || !fileContent) {
      return c.json({
        success: false,
        message: '缺少必要的上传参数'
      }, 400);
    }

    // 构建WebDAV URL
    const baseUrl = config.serverUrl.replace(/\/$/, '');
    let webdavUrl;

    // 检查服务器地址是否已经包含完整的WebDAV路径
    if (baseUrl.includes('/remote.php/dav/files/')) {
      // 如果已经包含完整路径，直接使用
      const targetPath = config.targetPath.startsWith('/') ? config.targetPath : `/${config.targetPath}`;
      webdavUrl = `${baseUrl}${targetPath}/${fileName}`;
    } else {
      // 如果是基础URL，构建完整的WebDAV路径
      const targetPath = config.targetPath.startsWith('/') ? config.targetPath : `/${config.targetPath}`;
      webdavUrl = `${baseUrl}/remote.php/dav/files/${config.username}${targetPath}/${fileName}`;
    }

    console.log(`📤 构建WebDAV URL: ${webdavUrl}`);

    // 创建Basic Auth头
    const auth = btoa(`${config.username}:${config.password}`);

    // 将Base64转换为ArrayBuffer
    const binaryString = atob(fileContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log(`📤 上传文件到Nextcloud: ${webdavUrl}`);
    console.log(`👤 用户名: ${config.username}`);
    console.log(`📁 目标路径: ${targetPath}`);
    console.log(`📄 文件名: ${fileName}`);

    // 上传文件到Nextcloud
    const uploadResponse = await fetch(webdavUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/pdf',
        'Content-Length': bytes.length.toString(),
        'User-Agent': 'CS-Report-System/1.0'
      },
      body: bytes
    });

    console.log(`📡 上传响应状态: ${uploadResponse.status} ${uploadResponse.statusText}`);

    if (uploadResponse.ok || uploadResponse.status === 201) {
      console.log('✅ 文件上传成功');

      // 记录上传日志（可选）
      try {
        await c.env.DB.prepare(`
          INSERT INTO upload_logs (
            form_id, file_name, upload_path, server_url,
            uploaded_at, company_name, contact_person
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          formData.queryCode || 'unknown',
          fileName,
          `${config.targetPath}/${fileName}`,
          config.serverUrl,
          new Date().toISOString(),
          formData.companyName,
          formData.contactPerson
        ).run();
      } catch (logError) {
        console.warn('⚠️ 上传日志记录失败:', logError);
        // 不影响主要功能，继续执行
      }

      return c.json({
        success: true,
        message: '文件已成功上传到图书馆',
        data: {
          fileName,
          uploadPath: `${config.targetPath}/${fileName}`,
          uploadTime: new Date().toISOString()
        }
      });
    } else {
      const errorText = await uploadResponse.text().catch(() => '无法获取错误详情');
      console.error('❌ Nextcloud上传失败:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        url: webdavUrl,
        errorBody: errorText,
        config: {
          serverUrl: config.serverUrl,
          username: config.username,
          targetPath: config.targetPath
        }
      });

      return c.json({
        success: false,
        message: `上传失败: ${uploadResponse.status} ${uploadResponse.statusText}`,
        error: errorText,
        debug: {
          url: webdavUrl,
          status: uploadResponse.status
        }
      }, uploadResponse.status);
    }

  } catch (error) {
    console.error('Nextcloud上传时出错:', error);
    return c.json({
      success: false,
      message: '上传过程中发生错误，请检查网络连接和配置信息'
    }, 500);
  }
});

// 生成邮件HTML内容
function generateEmailHTML(formData: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
        业务员见客报告
      </h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #495057; margin-top: 0;">基本信息</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold; width: 30%;">公司名称:</td><td style="padding: 8px;">${formData.companyName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">联系人:</td><td style="padding: 8px;">${formData.contactPerson}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">手机:</td><td style="padding: 8px;">${formData.mobile}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">地址:</td><td style="padding: 8px;">${formData.address}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">报告日期:</td><td style="padding: 8px;">${formData.reportDate}</td></tr>
        </table>
      </div>

      <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h4 style="color: #495057; margin-top: 0;">主要业务</h4>
        <p style="margin: 5px 0;">${formData.mainBusiness}</p>
        <h4 style="color: #495057;">产品</h4>
        <p style="margin: 5px 0;">${formData.products}</p>
        <h4 style="color: #495057;">服务需求</h4>
        <p style="margin: 5px 0;">${formData.serviceNeeds}</p>
      </div>

      ${formData.chatRecords ? `
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h4 style="color: #856404; margin-top: 0;">聊天记录</h4>
        <p style="white-space: pre-line; margin: 5px 0;">${formData.chatRecords}</p>
      </div>
      ` : ''}

      <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #d4edda; border-radius: 5px;">
        <p style="margin: 0; color: #155724;">
          <strong>查询码: ${formData.queryCode}</strong><br>
          <small>请保存此查询码以便后续查询报告</small>
        </p>
      </div>
    </div>
  `;
}

// 获取Nextcloud配置的辅助函数
async function getNextcloudConfig(db: D1Database) {
  // 这里应该从数据库或环境变量获取配置
  // 暂时返回null，需要根据实际情况实现
  return null;
}

// 测试Nextcloud连接
app.get('/api/test-nextcloud', async (c) => {
  try {
    // 从请求参数获取配置信息
    const serverUrl = c.req.query('serverUrl');
    const username = c.req.query('username');
    const password = c.req.query('password');
    const targetPath = c.req.query('targetPath') || '/Sales Report';

    if (!serverUrl || !username || !password) {
      return c.json({
        success: false,
        message: '缺少必要的连接参数：serverUrl, username, password'
      }, 400);
    }

    const auth = btoa(`${username}:${password}`);
    const baseUrl = serverUrl.replace(/\/$/, '');
    let testUrl;

    // 检查服务器地址是否已经包含完整的WebDAV路径
    if (baseUrl.includes('/remote.php/dav/files/')) {
      // 如果已经包含完整路径，直接使用作为测试URL
      testUrl = baseUrl + '/';
    } else {
      // 如果是基础URL，构建完整的WebDAV路径
      testUrl = `${baseUrl}/remote.php/dav/files/${username}/`;
    }

    console.log(`🔍 测试Nextcloud连接: ${testUrl}`);

    const response = await fetch(testUrl, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Depth': '1',
        'User-Agent': 'CS-Report-System/1.0'
      }
    });

    const responseText = await response.text().catch(() => '无法获取响应内容');

    // 分析配置并提供建议
    const isFullWebDAVUrl = baseUrl.includes('/remote.php/dav/files/');
    const configAnalysis = {
      detectedType: isFullWebDAVUrl ? 'Full WebDAV URL' : 'Base Server URL',
      recommendation: isFullWebDAVUrl
        ? '✅ 配置正确：使用完整的WebDAV URL'
        : '⚠️ 建议：如果连接失败，请尝试使用完整的WebDAV URL',
      suggestedFullUrl: isFullWebDAVUrl
        ? serverUrl
        : `${baseUrl}/remote.php/dav/files/${username}`
    };

    return c.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      message: response.ok ? '连接成功' : '连接失败',
      config: {
        serverUrl: serverUrl,
        username: username,
        targetPath: targetPath,
        testUrl: testUrl
      },
      analysis: configAnalysis,
      response: response.ok ? '连接正常' : responseText.substring(0, 500)
    });
  } catch (error) {
    console.error('❌ 测试Nextcloud连接失败:', error);
    return c.json({
      success: false,
      message: '测试连接时出错',
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default app;
