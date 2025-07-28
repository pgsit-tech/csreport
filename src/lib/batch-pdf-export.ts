import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FormData } from '@/types/form';

// 生成单个表单的PDF
async function generateSingleFormPDF(formData: FormData): Promise<{ pdfBlob: Blob, fileName: string }> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // 设置中文字体（简化版本，实际项目中需要加载中文字体）
  pdf.setFont('helvetica');
  
  let yPosition = 20;
  const lineHeight = 8;
  const leftMargin = 20;
  const rightMargin = 190;
  
  // 标题
  pdf.setFontSize(18);
  pdf.text('Business Visit Report', leftMargin, yPosition);
  yPosition += lineHeight * 2;
  
  // 查询码
  pdf.setFontSize(12);
  pdf.text(`Query Code: ${formData.queryCode || 'N/A'}`, leftMargin, yPosition);
  yPosition += lineHeight * 2;
  
  // 基本信息
  pdf.setFontSize(14);
  pdf.text('Basic Information', leftMargin, yPosition);
  yPosition += lineHeight;
  
  pdf.setFontSize(10);
  const basicInfo = [
    `Company: ${formData.companyName}`,
    `Address: ${formData.address}`,
    `Phone: ${formData.phone || 'N/A'}`,
    `Website: ${formData.website || 'N/A'}`,
    `Company Size: ${formData.companySize}`,
    `Office Size: ${formData.officeSize}`
  ];
  
  basicInfo.forEach(info => {
    pdf.text(info, leftMargin, yPosition);
    yPosition += lineHeight;
  });
  
  yPosition += lineHeight;
  
  // 联系人信息
  pdf.setFontSize(14);
  pdf.text('Contact Information', leftMargin, yPosition);
  yPosition += lineHeight;
  
  pdf.setFontSize(10);
  const contactInfo = [
    `Contact Person: ${formData.contactPerson}`,
    `Mobile: ${formData.mobile}`,
    `WeChat: ${formData.wechat || 'N/A'}`
  ];
  
  contactInfo.forEach(info => {
    pdf.text(info, leftMargin, yPosition);
    yPosition += lineHeight;
  });
  
  yPosition += lineHeight;
  
  // 业务信息
  pdf.setFontSize(14);
  pdf.text('Business Information', leftMargin, yPosition);
  yPosition += lineHeight;
  
  pdf.setFontSize(10);
  const businessInfo = [
    `Main Business: ${formData.mainBusiness}`,
    `Products: ${formData.products}`,
    `Service Needs: ${formData.serviceNeeds}`,
    `Salesperson: ${formData.salesperson || 'Not Specified'}`
  ];
  
  businessInfo.forEach(info => {
    // 处理长文本换行
    const lines = pdf.splitTextToSize(info, rightMargin - leftMargin);
    lines.forEach((line: string) => {
      if (yPosition > 280) { // 接近页面底部时添加新页
        pdf.addPage();
        yPosition = 20;
      }
      pdf.text(line, leftMargin, yPosition);
      yPosition += lineHeight;
    });
  });
  
  // 聊天记录
  if (formData.chatRecords) {
    yPosition += lineHeight;
    pdf.setFontSize(14);
    pdf.text('Chat Records', leftMargin, yPosition);
    yPosition += lineHeight;
    
    pdf.setFontSize(10);
    const chatLines = pdf.splitTextToSize(formData.chatRecords, rightMargin - leftMargin);
    chatLines.forEach((line: string) => {
      if (yPosition > 280) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.text(line, leftMargin, yPosition);
      yPosition += lineHeight;
    });
  }
  
  // 报告信息
  yPosition += lineHeight;
  pdf.setFontSize(14);
  pdf.text('Report Information', leftMargin, yPosition);
  yPosition += lineHeight;
  
  pdf.setFontSize(10);
  const reportInfo = [
    `Report Date: ${formData.reportDate}`,
    `Created: ${new Date(formData.createdAt).toLocaleDateString()}`
  ];
  
  reportInfo.forEach(info => {
    pdf.text(info, leftMargin, yPosition);
    yPosition += lineHeight;
  });
  
  // 生成文件名
  const cleanCompanyName = formData.companyName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
  const cleanSalesperson = (formData.salesperson || 'Unknown').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
  const cleanDate = formData.reportDate.replace(/[^0-9-]/g, '');
  const fileName = `${cleanCompanyName}_${cleanSalesperson}_${cleanDate}.pdf`;
  
  const pdfBlob = pdf.output('blob');
  return { pdfBlob, fileName };
}

// 批量导出PDF并打包成ZIP
export async function exportFormsAsZip(forms: FormData[]): Promise<void> {
  if (forms.length === 0) {
    throw new Error('No forms to export');
  }
  
  // 如果只有一个表单，直接下载PDF
  if (forms.length === 1) {
    const { pdfBlob, fileName } = await generateSingleFormPDF(forms[0]);
    saveAs(pdfBlob, fileName);
    return;
  }
  
  // 多个表单时创建ZIP
  const zip = new JSZip();
  
  // 为每个表单生成PDF并添加到ZIP
  for (let i = 0; i < forms.length; i++) {
    const form = forms[i];
    try {
      const { pdfBlob, fileName } = await generateSingleFormPDF(form);
      zip.file(fileName, pdfBlob);
    } catch (error) {
      console.error(`Failed to generate PDF for form ${form.companyName}:`, error);
      // 继续处理其他表单
    }
  }
  
  // 生成ZIP文件
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipFileName = `客户报告批量导出_${forms.length}份_${new Date().toISOString().split('T')[0]}.zip`;
  
  // 下载ZIP文件
  saveAs(zipBlob, zipFileName);
}

// 导出所有表单
export async function exportAllFormsAsZip(forms: FormData[]): Promise<void> {
  return exportFormsAsZip(forms);
}
