// 生成随机查询码
export function generateQueryCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 生成UUID
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 格式化日期
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 格式化日期时间
export function formatDateTime(date: Date): string {
  return date.toISOString();
}

// 转换表单数据为数据库格式（支持两种输入格式：表单格式和数据库格式）
export function formDataToDbFormat(data: any) {
  // 辅助函数：获取字段值，支持表单格式和数据库格式
  const getFieldValue = (formField: string, dbField: string) => {
    return data[formField] || data[dbField];
  };

  return {
    id: data.id || generateId(),
    query_code: getFieldValue('queryCode', 'query_code') || generateQueryCode(),
    custom_query_code: getFieldValue('customQueryCode', 'custom_query_code') || null,
    company_name: getFieldValue('companyName', 'company_name'),
    address: data.address,
    phone: data.phone || null,
    website: data.website || null,
    contact_person: getFieldValue('contactPerson', 'contact_person'),
    mobile: data.mobile,
    wechat: data.wechat || null,
    company_size: getFieldValue('companySize', 'company_size'),
    office_size: getFieldValue('officeSize', 'office_size'),
    main_business: getFieldValue('mainBusiness', 'main_business'),
    products: data.products,
    service_needs: getFieldValue('serviceNeeds', 'service_needs'),
    salesperson: data.salesperson,
    chat_records: getFieldValue('chatRecords', 'chat_records') || null,
    report_date: getFieldValue('reportDate', 'report_date') || formatDate(new Date()),
    created_at: formatDateTime(new Date()),
    updated_at: formatDateTime(new Date())
  };
}

// 转换数据库数据为前端格式
export function dbDataToFormFormat(data: any) {
  return {
    id: data.id,
    queryCode: data.query_code,
    customQueryCode: data.custom_query_code,
    companyName: data.company_name,
    address: data.address,
    phone: data.phone,
    website: data.website,
    contactPerson: data.contact_person,
    mobile: data.mobile,
    wechat: data.wechat,
    companySize: data.company_size,
    officeSize: data.office_size,
    mainBusiness: data.main_business,
    products: data.products,
    serviceNeeds: data.service_needs,
    salesperson: data.salesperson,
    chatRecords: data.chat_records,
    reportDate: data.report_date,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}
