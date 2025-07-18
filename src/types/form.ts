export interface FormData {
  id?: string;
  queryCode?: string;
  customQueryCode?: string;
  
  // 基本信息
  companyName: string;
  address: string;
  phone: string;
  website: string;
  
  // 联系人信息
  contactPerson: string;
  mobile: string;
  wechat: string;
  
  // 公司详情
  companySize: string;
  officeSize: string;
  
  // 业务信息
  mainBusiness: string;
  products: string;
  serviceNeeds: string;
  chatRecords: string;
  
  // 系统字段
  createdAt: string;
  updatedAt: string;
  reportDate: string;
}

export interface QueryResponse {
  success: boolean;
  data?: FormData;
  message?: string;
}

export interface SubmitResponse {
  success: boolean;
  queryCode?: string;
  message?: string;
}

export interface EmailRequest {
  to: string;
  formData: FormData;
  pdfBuffer?: ArrayBuffer;
}

export interface EmailResponse {
  success: boolean;
  message?: string;
}

// 表单验证schema
export const formFields = {
  companyName: { label: '公司名称', required: true },
  address: { label: '地址', required: true },
  phone: { label: '电话', required: false },
  website: { label: '网站', required: false },
  contactPerson: { label: '联系人', required: true },
  mobile: { label: '手机', required: true },
  wechat: { label: '微信', required: false },
  companySize: { label: '公司人数（可见人数）', required: true },
  officeSize: { label: '办公室多大', required: true },
  mainBusiness: { label: '主要业务', required: true },
  products: { label: '产品', required: true },
  serviceNeeds: { label: '服务需求', required: true },
  chatRecords: { label: '聊天记录', required: false },
} as const;
