'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { emailSchema, EmailValues } from '@/lib/schema';
import { FormData } from '@/types/form';
import { generatePDF } from '@/lib/pdf-generator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail } from 'lucide-react';

interface EmailDialogProps {
  formData: FormData;
  open: boolean;
  onClose: () => void;
}

export function EmailDialog({ formData, open, onClose }: EmailDialogProps) {
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema)
  });

  const handleSendEmail = async (data: EmailValues) => {
    setIsSending(true);
    setSendResult(null);

    try {
      // 生成PDF
      const { pdfBlob } = await generatePDF(formData);
      const pdfBuffer = await pdfBlob.arrayBuffer();

      // 发送邮件请求
      const apiUrl = process.env.NODE_ENV === 'production'
        ? 'https://your-worker.your-domain.workers.dev/api/send-email'
        : '/api/send-email';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: data.email,
          formData,
          pdfBuffer: Array.from(new Uint8Array(pdfBuffer))
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSendResult({ success: true, message: '邮件发送成功！' });
        setTimeout(() => {
          onClose();
          reset();
          setSendResult(null);
        }, 2000);
      } else {
        setSendResult({ success: false, message: result.message || '邮件发送失败' });
      }
    } catch (error) {
      console.error('邮件发送失败:', error);
      setSendResult({ success: false, message: '邮件发送失败，请重试' });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      onClose();
      reset();
      setSendResult(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            发送邮件
          </DialogTitle>
          <DialogDescription>
            将业务员见客报告以PDF格式发送到指定邮箱
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleSendEmail)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">收件人邮箱 *</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@company.com"
              {...register('email')}
              className={errors.email ? 'border-red-500' : ''}
              disabled={isSending}
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email.message}</p>
            )}
          </div>

          <div className="bg-gray-50 p-3 rounded-md">
            <h4 className="font-medium text-sm mb-2">邮件内容预览：</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 公司名称: {formData.companyName}</li>
              <li>• 联系人: {formData.contactPerson}</li>
              <li>• 报告日期: {formData.reportDate}</li>
              <li>• 查询码: {formData.queryCode}</li>
            </ul>
          </div>

          {sendResult && (
            <div className={`p-3 rounded-md ${sendResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm ${sendResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {sendResult.message}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSending}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  发送中...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  发送邮件
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
