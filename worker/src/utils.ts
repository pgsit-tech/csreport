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

// 转换表单数据为数据库格式
export function formDataToDbFormat(data: any) {
  return {
    id: data.id || generateId(),
    query_code: data.queryCode || generateQueryCode(),
    custom_query_code: data.customQueryCode || null,
    company_name: data.companyName,
    address: data.address,
    phone: data.phone || null,
    website: data.website || null,
    contact_person: data.contactPerson,
    mobile: data.mobile,
    wechat: data.wechat || null,
    company_size: data.companySize,
    office_size: data.officeSize,
    main_business: data.mainBusiness,
    products: data.products,
    service_needs: data.serviceNeeds,
    chat_records: data.chatRecords || null,
    report_date: data.reportDate || formatDate(new Date()),
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
    chatRecords: data.chat_records,
    reportDate: data.report_date,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}
