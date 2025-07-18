import { z } from 'zod';

export const formSchema = z.object({
  companyName: z.string().min(1, { message: '公司名称不能为空' }),
  address: z.string().min(1, { message: '地址不能为空' }),
  phone: z.string().optional(),
  website: z.string().optional(),
  contactPerson: z.string().min(1, { message: '联系人不能为空' }),
  mobile: z.string().min(1, { message: '手机号不能为空' }),
  wechat: z.string().optional(),
  companySize: z.string().min(1, { message: '公司人数不能为空' }),
  officeSize: z.string().min(1, { message: '办公室大小不能为空' }),
  mainBusiness: z.string().min(1, { message: '主要业务不能为空' }),
  products: z.string().min(1, { message: '产品不能为空' }),
  serviceNeeds: z.string().min(1, { message: '服务需求不能为空' }),
  chatRecords: z.string().optional(),
  customQueryCode: z.string().optional(),
  reportDate: z.string().optional()
});

export const querySchema = z.object({
  queryCode: z.string().min(1, { message: '查询码不能为空' })
});

export const emailSchema = z.object({
  email: z.string().email({ message: '请输入有效的邮箱地址' })
});

export type FormValues = z.infer<typeof formSchema>;
export type QueryValues = z.infer<typeof querySchema>;
export type EmailValues = z.infer<typeof emailSchema>;
