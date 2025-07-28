import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FormData } from '@/types/form';
import { generatePDFFileName } from './utils';

// 使用与页面生成相同的方法生成单个表单的PDF
async function generateSingleFormPDF(formData: FormData): Promise<{ pdfBlob: Blob, fileName: string }> {
  // 创建一个临时的HTML元素来渲染表单数据
  const element = document.createElement('div');
  element.className = 'pdf-container';
  element.style.width = '210mm';
  element.style.padding = '10mm';
  element.style.backgroundColor = 'white';
  element.style.fontFamily = 'Arial, sans-serif';
  element.style.position = 'absolute';
  element.style.left = '-9999px';
  element.style.top = '-9999px';

  // 添加表单内容（与原有的generatePDF函数相同的HTML结构）
  element.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="font-size: 24px; margin-bottom: 5px;">业务员见客报告</h1>
      <p style="font-size: 14px; color: #666;">报告日期: ${formData.reportDate}</p>
      ${formData.queryCode ? `<p style="font-size: 12px; color: #888;">查询码: ${formData.queryCode}</p>` : ''}
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
        <tr>
          <td style="width: 30%; padding: 8px; font-weight: bold;">负责业务员:</td>
          <td style="padding: 8px;">${formData.salesperson || '未指定'}</td>
        </tr>
      </table>
    </div>

    ${formData.chatRecords ? `
    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;">聊天记录</h2>
      <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; white-space: pre-wrap;">
        ${formData.chatRecords}
      </div>
    </div>
    ` : ''}

    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;">报告信息</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 30%; padding: 8px; font-weight: bold;">创建时间:</td>
          <td style="padding: 8px;">${new Date(formData.createdAt).toLocaleString('zh-CN')}</td>
        </tr>
        ${formData.customQueryCode ? `
        <tr>
          <td style="width: 30%; padding: 8px; font-weight: bold;">自定义查询码:</td>
          <td style="padding: 8px;">${formData.customQueryCode}</td>
        </tr>
        ` : ''}
      </table>
    </div>
  `;

  try {
    // 将元素添加到DOM中
    document.body.appendChild(element);

    // 使用html2canvas生成canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    // 创建PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');

    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // 生成PDF文件名：客户名称+业务员+日期
    const fileName = generatePDFFileName(formData.companyName, formData.salesperson, formData.reportDate);

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

// 导出单个表单为PDF
export async function exportSingleFormAsPDF(form: FormData): Promise<void> {
  const { pdfBlob, fileName } = await generateSingleFormPDF(form);
  saveAs(pdfBlob, fileName);
}

// 批量导出PDF并打包成ZIP（始终创建ZIP，即使只有一个文件）
export async function exportFormsAsZip(forms: FormData[]): Promise<void> {
  if (forms.length === 0) {
    throw new Error('No forms to export');
  }

  // 创建ZIP文件
  const zip = new JSZip();

  console.log(`开始生成 ${forms.length} 个PDF文件...`);

  // 为每个表单生成PDF并添加到ZIP
  for (let i = 0; i < forms.length; i++) {
    const form = forms[i];
    console.log(`正在处理第 ${i + 1}/${forms.length} 个表单: ${form.companyName}`);

    try {
      const { pdfBlob, fileName } = await generateSingleFormPDF(form);
      zip.file(fileName, pdfBlob);
      console.log(`已添加到ZIP: ${fileName}`);
    } catch (error) {
      console.error(`Failed to generate PDF for form ${form.companyName}:`, error);
      // 继续处理其他表单
    }
  }

  console.log('正在生成ZIP文件...');

  // 生成ZIP文件
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6
    }
  });

  const zipFileName = `客户报告批量导出_${forms.length}份_${new Date().toISOString().split('T')[0]}.zip`;

  console.log(`ZIP文件生成完成: ${zipFileName}`);

  // 下载ZIP文件
  saveAs(zipBlob, zipFileName);
}

// 导出所有表单
export async function exportAllFormsAsZip(forms: FormData[]): Promise<void> {
  return exportFormsAsZip(forms);
}
