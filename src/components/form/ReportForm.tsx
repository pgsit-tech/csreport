'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema, FormValues } from '@/lib/schema';
import { FormData } from '@/types/form';
import { generatePDF } from '@/lib/pdf-generator';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Download, Mail } from 'lucide-react';
import { EmailDialog } from './EmailDialog';

interface ReportFormProps {
  initialData?: FormData;
  onSubmit?: (data: FormData) => Promise<{ success: boolean; queryCode?: string; message?: string }>;
}

export function ReportForm({ initialData, onSubmit }: ReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; queryCode?: string; message?: string } | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [currentFormData, setCurrentFormData] = useState<FormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      companyName: initialData.companyName,
      address: initialData.address,
      phone: initialData.phone || '',
      website: initialData.website || '',
      contactPerson: initialData.contactPerson,
      mobile: initialData.mobile,
      wechat: initialData.wechat || '',
      companySize: initialData.companySize,
      officeSize: initialData.officeSize,
      mainBusiness: initialData.mainBusiness,
      products: initialData.products,
      serviceNeeds: initialData.serviceNeeds,
      chatRecords: initialData.chatRecords || '',
      customQueryCode: initialData.customQueryCode || '',
      reportDate: initialData.reportDate || formatDate(new Date())
    } : {
      reportDate: formatDate(new Date())
    }
  });

  const handleFormSubmit = async (data: FormValues) => {
    if (!onSubmit) return;
    
    setIsSubmitting(true);
    try {
      const formData: FormData = {
        ...data,
        reportDate: data.reportDate || formatDate(new Date()),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as FormData;

      const result = await onSubmit(formData);
      setSubmitResult(result);
      
      if (result.success && result.queryCode) {
        setCurrentFormData({ ...formData, queryCode: result.queryCode });
      }
    } catch {
      setSubmitResult({ success: false, message: '提交失败，请重试' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const formData = getValues();
      const pdfData: FormData = {
        ...formData,
        queryCode: submitResult?.queryCode || currentFormData?.queryCode || 'PREVIEW',
        reportDate: formData.reportDate || formatDate(new Date()),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as FormData;

      const { pdfBlob, fileName } = await generatePDF(pdfData);
      
      // 下载PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF生成失败:', error);
      alert('PDF生成失败，请重试');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSendEmail = () => {
    const formData = getValues();
    const emailData: FormData = {
      ...formData,
      queryCode: submitResult?.queryCode || currentFormData?.queryCode || '',
      reportDate: formData.reportDate || formatDate(new Date()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as FormData;
    
    setCurrentFormData(emailData);
    setShowEmailDialog(true);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center">业务员见客报告</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">基本信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">公司名称 *</Label>
                  <Input
                    id="companyName"
                    {...register('companyName')}
                    className={errors.companyName ? 'border-red-500' : ''}
                  />
                  {errors.companyName && (
                    <p className="text-red-500 text-sm mt-1">{errors.companyName.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="reportDate">报告日期</Label>
                  <Input
                    id="reportDate"
                    type="date"
                    {...register('reportDate')}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="address">地址 *</Label>
                  <Input
                    id="address"
                    {...register('address')}
                    className={errors.address ? 'border-red-500' : ''}
                  />
                  {errors.address && (
                    <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="phone">电话</Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                  />
                </div>
                
                <div>
                  <Label htmlFor="website">网站</Label>
                  <Input
                    id="website"
                    {...register('website')}
                    placeholder="https://"
                  />
                </div>
              </div>
            </div>

            {/* 联系人信息 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">联系人信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="contactPerson">联系人 *</Label>
                  <Input
                    id="contactPerson"
                    {...register('contactPerson')}
                    className={errors.contactPerson ? 'border-red-500' : ''}
                  />
                  {errors.contactPerson && (
                    <p className="text-red-500 text-sm mt-1">{errors.contactPerson.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="mobile">手机 *</Label>
                  <Input
                    id="mobile"
                    {...register('mobile')}
                    className={errors.mobile ? 'border-red-500' : ''}
                  />
                  {errors.mobile && (
                    <p className="text-red-500 text-sm mt-1">{errors.mobile.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="wechat">微信</Label>
                  <Input
                    id="wechat"
                    {...register('wechat')}
                  />
                </div>
              </div>
            </div>

            {/* 公司详情 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">公司详情</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companySize">公司人数（可见人数） *</Label>
                  <Input
                    id="companySize"
                    {...register('companySize')}
                    className={errors.companySize ? 'border-red-500' : ''}
                  />
                  {errors.companySize && (
                    <p className="text-red-500 text-sm mt-1">{errors.companySize.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="officeSize">办公室多大 *</Label>
                  <Input
                    id="officeSize"
                    {...register('officeSize')}
                    className={errors.officeSize ? 'border-red-500' : ''}
                  />
                  {errors.officeSize && (
                    <p className="text-red-500 text-sm mt-1">{errors.officeSize.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 业务信息 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">业务信息</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="mainBusiness">主要业务 *</Label>
                  <Textarea
                    id="mainBusiness"
                    {...register('mainBusiness')}
                    className={errors.mainBusiness ? 'border-red-500' : ''}
                    rows={3}
                  />
                  {errors.mainBusiness && (
                    <p className="text-red-500 text-sm mt-1">{errors.mainBusiness.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="products">产品 *</Label>
                  <Textarea
                    id="products"
                    {...register('products')}
                    className={errors.products ? 'border-red-500' : ''}
                    rows={3}
                  />
                  {errors.products && (
                    <p className="text-red-500 text-sm mt-1">{errors.products.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="serviceNeeds">服务需求 *</Label>
                  <Textarea
                    id="serviceNeeds"
                    {...register('serviceNeeds')}
                    className={errors.serviceNeeds ? 'border-red-500' : ''}
                    rows={3}
                  />
                  {errors.serviceNeeds && (
                    <p className="text-red-500 text-sm mt-1">{errors.serviceNeeds.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="chatRecords">聊天记录</Label>
                  <Textarea
                    id="chatRecords"
                    {...register('chatRecords')}
                    rows={5}
                    placeholder="记录与客户的重要对话内容..."
                  />
                </div>
              </div>
            </div>

            {/* 查询码设置 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">查询码设置</h3>
              <div>
                <Label htmlFor="customQueryCode">自定义查询码（可选）</Label>
                <Input
                  id="customQueryCode"
                  {...register('customQueryCode')}
                  placeholder="留空将自动生成随机查询码"
                />
                <p className="text-sm text-gray-500 mt-1">
                  查询码用于后续查询表单信息，建议使用易记的字符组合
                </p>
              </div>
            </div>

            {/* 提交结果显示 */}
            {submitResult && (
              <div className={`p-4 rounded-md ${submitResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={submitResult.success ? 'text-green-800' : 'text-red-800'}>
                  {submitResult.message}
                </p>
                {submitResult.success && submitResult.queryCode && (
                  <p className="text-green-800 font-semibold mt-2">
                    查询码: {submitResult.queryCode}
                  </p>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-4 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存表单'
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
                className="flex-1 min-w-[120px]"
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    导出PDF
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleSendEmail}
                className="flex-1 min-w-[120px]"
              >
                <Mail className="mr-2 h-4 w-4" />
                发送邮件
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 邮件发送对话框 */}
      {showEmailDialog && currentFormData && (
        <EmailDialog
          formData={currentFormData}
          open={showEmailDialog}
          onClose={() => setShowEmailDialog(false)}
        />
      )}
    </div>
  );
}
