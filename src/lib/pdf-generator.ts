import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { FormData } from '@/types/form';
import { generatePDFFileName } from './utils';

export async function generatePDF(formData: FormData): Promise<{ pdfBlob: Blob, fileName: string }> {
  // 创建一个临时的HTML元素来渲染表单数据
  const element = document.createElement('div');
  element.className = 'pdf-container';
  element.style.width = '210mm';
  element.style.padding = '10mm';
  element.style.backgroundColor = 'white';
  element.style.fontFamily = 'Arial, sans-serif';
  
  // 添加表单内容
  element.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="font-size: 24px; margin-bottom: 5px;">业务员见客报告</h1>
      <p style="font-size: 14px; color: #666;">报告日期: ${formData.reportDate}</p>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;">公司信息</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 30%; padding: 8px; font-weight: bold;">公司名称:</td>
          <td style="padding: 8px;">${formData.companyName}</td>
        </tr>
        <tr>
          <td style="width: 30%; padding: 8px; font-weight: bold;">地址:</td>
          <td style="padding: 8px;">${formData.address}</td>
        </tr>
        <tr>
          <td style="width: 30%; padding: 8px; font-weight: bold;">电话:</td>
          <td style="padding: 8px;">${formData.phone || '-'}</td>
        </tr>
        <tr>
          <td style="width: 30%; padding: 8px; font-weight: bold;">网站:</td>
          <td style="padding: 8px;">${formData.website || '-'}</td>
        </tr>
        <tr>
          <td style="width: 30%; padding: 8px; font-weight: bold;">公司人数:</td>
          <td style="padding: 8px;">${formData.companySize}</td>
        </tr>
        <tr>
          <td style="width: 30%; padding: 8px; font-weight: bold;">办公室大小:</td>
          <td style="padding: 8px;">${formData.officeSize}</td>
        </tr>
      </table>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;">联系人信息</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 30%; padding: 8px; font-weight: bold;">联系人:</td>
          <td style="padding: 8px;">${formData.contactPerson}</td>
        </tr>
        <tr>
          <td style="width: 30%; padding: 8px; font-weight: bold;">手机:</td>
          <td style="padding: 8px;">${formData.mobile}</td>
        </tr>
        <tr>
          <td style="width: 30%; padding: 8px; font-weight: bold;">微信:</td>
          <td style="padding: 8px;">${formData.wechat || '-'}</td>
        </tr>
      </table>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;">业务信息</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 30%; padding: 8px; font-weight: bold;">主要业务:</td>
          <td style="padding: 8px;">${formData.mainBusiness}</td>
        </tr>
        <tr>
          <td style="width: 30%; padding: 8px; font-weight: bold;">产品:</td>
          <td style="padding: 8px;">${formData.products}</td>
        </tr>
        <tr>
          <td style="width: 30%; padding: 8px; font-weight: bold;">服务需求:</td>
          <td style="padding: 8px;">${formData.serviceNeeds}</td>
        </tr>
      </table>
    </div>
    
    ${formData.chatRecords ? `
    <div>
      <h2 style="font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;">聊天记录</h2>
      <p style="white-space: pre-line; padding: 8px;">${formData.chatRecords}</p>
    </div>
    ` : ''}
    
    <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
      <p>查询码: ${formData.queryCode}</p>
    </div>
  `;
  
  // 将元素添加到DOM中以便渲染
  document.body.appendChild(element);
  
  try {
    // 使用html2canvas将HTML转换为canvas
    const canvas = await html2canvas(element, {
      scale: 2, // 提高清晰度
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    // 创建PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // 将canvas添加到PDF
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4宽度
    const pageHeight = 295; // A4高度
    const imgHeight = canvas.height * imgWidth / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    // 如果内容超过一页，添加新页面
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    // 生成PDF文件名
    const fileName = generatePDFFileName(formData.companyName, formData.reportDate);
    
    // 生成PDF Blob
    const pdfBlob = pdf.output('blob');
    
    return { pdfBlob, fileName };
  } finally {
    // 清理临时元素
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }
}
