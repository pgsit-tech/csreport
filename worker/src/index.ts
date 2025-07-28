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

    // 如果只有一个表单，直接返回PDF
    if (forms.length === 1) {
      const form = forms[0];
      const htmlContent = generateFormPDF(form);

      // 使用 Puppeteer API 生成 PDF
      const pdfResponse = await fetch('https://api.htmlcsstoimage.com/v1/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('your-api-key:')
        },
        body: JSON.stringify({
          html: htmlContent,
          format: 'pdf',
          width: 800,
          height: 1200
        })
      });

      if (pdfResponse.ok) {
        const pdfBuffer = await pdfResponse.arrayBuffer();
        const fileName = `${form.companyName}_${form.salesperson || '未知业务员'}_${form.reportDate.replace(/[^0-9-]/g, '')}.pdf`;

        return new Response(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`
          }
        });
      }
    }

    // 多个表单时，创建ZIP压缩包
    // 由于Cloudflare Worker的限制，我们暂时返回一个包含所有表单信息的合并PDF
    const combinedHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>批量客户报告</title>
  <style>
    body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 20px; line-height: 1.6; }
    .report { page-break-after: always; margin-bottom: 50px; }
    .report:last-child { page-break-after: auto; }
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
  ${forms.map(form => `
    <div class="report">
      ${generateFormPDF(form).replace(/<!DOCTYPE html>[\s\S]*?<body>/, '').replace(/<\/body>[\s\S]*?<\/html>/, '')}
    </div>
  `).join('')}
</body>
</html>
    `;

    // 返回合并的PDF（简化版本，实际生产环境建议使用专门的PDF生成服务）
    const fileName = `批量客户报告_${new Date().toISOString().split('T')[0]}.html`;

    return new Response(combinedHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`
      }
    });

  } catch (error) {
    console.error('导出时出错:', error);
    return c.json({ success: false, message: '导出失败，请重试' }, 500);
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

export default app;
