import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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

// 计算日期是一年中的第几周
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// 生成PDF文件名：业务员+周数+客户名称+日期
export function generatePDFFileName(companyName: string, salesperson: string, date: string): string {
  const cleanCompanyName = companyName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
  const cleanSalesperson = (salesperson || '未知销售').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
  const cleanDate = date.replace(/[^0-9-]/g, '');

  // 计算周数
  const reportDate = new Date(date);
  const weekNumber = getWeekNumber(reportDate);
  const year = reportDate.getFullYear();
  const weekStr = `${year}年第${weekNumber}周`;

  return `${cleanSalesperson}_${weekStr}_${cleanCompanyName}_${cleanDate}.pdf`;
}

// 验证查询码格式
export function isValidQueryCode(code: string): boolean {
  return /^[A-Z0-9]{6,12}$/.test(code);
}

// 验证邮箱格式
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 转换表单数据为数据库格式
export function formDataToDbFormat(data: Record<string, unknown>) {
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
export function dbDataToFormFormat(data: Record<string, unknown>) {
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
