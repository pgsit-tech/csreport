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
        main_business, products, service_needs, chat_records,
        report_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      dbData.id, dbData.query_code, dbData.custom_query_code, dbData.company_name,
      dbData.address, dbData.phone, dbData.website, dbData.contact_person,
      dbData.mobile, dbData.wechat, dbData.company_size, dbData.office_size,
      dbData.main_business, dbData.products, dbData.service_needs, dbData.chat_records,
      dbData.report_date, dbData.created_at, dbData.updated_at
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

// 管理接口 - 导出表单
app.post('/api/admin/export', async (c) => {
  try {
    const { forms } = await c.req.json();

    if (!forms || forms.length === 0) {
      return c.json({ success: false, message: '没有数据可导出' }, 400);
    }

    // 生成CSV内容
    const headers = [
      '查询码', '自定义查询码', '公司名称', '地址', '电话', '网站',
      '联系人', '手机', '微信', '公司人数', '办公室大小',
      '主要业务', '产品', '服务需求', '聊天记录',
      '报告日期', '创建时间', '更新时间'
    ];

    const csvRows = forms.map((form: any) => [
      form.queryCode,
      form.customQueryCode || '',
      form.companyName,
      form.address,
      form.phone || '',
      form.website || '',
      form.contactPerson,
      form.mobile,
      form.wechat || '',
      form.companySize,
      form.officeSize,
      form.mainBusiness,
      form.products,
      form.serviceNeeds,
      form.chatRecords || '',
      form.reportDate,
      new Date(form.createdAt).toLocaleString('zh-CN'),
      new Date(form.updatedAt).toLocaleString('zh-CN')
    ].map(field => {
      // 处理包含逗号或换行符的字段
      if (typeof field === 'string' && (field.includes(',') || field.includes('\n') || field.includes('"'))) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    }));

    const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
    
    // 添加BOM以支持中文
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    return new Response(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="客户报告导出_${new Date().toISOString().split('T')[0]}.csv"`
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
