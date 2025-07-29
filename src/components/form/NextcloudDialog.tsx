'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Cloud, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { FormData } from '@/types/form';
import { generatePDF } from '@/lib/pdf-generator';
import { fetchWithFallback, safeLog } from '@/lib/config';

interface NextcloudDialogProps {
  formData: FormData;
  onClose: () => void;
}

interface NextcloudConfig {
  serverUrl: string;
  username: string;
  password: string;
  targetPath: string;
}

export function NextcloudDialog({ formData, onClose }: NextcloudDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [config, setConfig] = useState<NextcloudConfig | null>(null);

  // 从API获取配置
  const loadConfig = async () => {
    try {
      const response = await fetchWithFallback('nextcloudConfig');
      const result = await response.json();

      if (result.success && result.data) {
        const config: NextcloudConfig = {
          serverUrl: result.data.serverUrl,
          username: result.data.username,
          password: '', // 密码不从API返回，需要重新输入
          targetPath: result.data.uploadPath
        };
        return config;
      } else {
        setMessage('Nextcloud配置未设置，请联系管理员配置');
        setUploadStatus('error');
        return null;
      }
    } catch (error) {
      safeLog.error('获取Nextcloud配置失败', error);
      setMessage('获取Nextcloud配置失败，请联系管理员');
      setUploadStatus('error');
      return null;
    }
  };

  // 组件初始化时加载配置
  useEffect(() => {
    const initConfig = async () => {
      const initialConfig = await loadConfig();
      setConfig(initialConfig);
    };
    initConfig();
  }, []);

  // 推送到Nextcloud
  const handlePushToNextcloud = async () => {
    const currentConfig = config || await loadConfig();
    if (!currentConfig) {
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');
    setMessage('');

    try {
      // 生成PDF
      setMessage('正在生成PDF文件...');
      const { pdfBlob, fileName } = await generatePDF(formData);
      
      // 转换为Base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const base64Content = base64Data.split(',')[1]; // 移除data:application/pdf;base64,前缀
        
        try {
          setMessage('正在上传到Nextcloud...');

          safeLog.debug('开始上传到Nextcloud', {
            fileName,
            configPath: currentConfig.targetPath
          });

          // 调用后端API上传到Nextcloud（配置从数据库获取）
          const response = await fetchWithFallback('nextcloudUpload', {
            method: 'POST',
            body: JSON.stringify({
              fileName,
              fileContent: base64Content,
              formData
            })
          });

          safeLog.debug('API响应状态', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            safeLog.error('API响应错误', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          const result = await response.json();
          safeLog.debug('API响应数据', result);
          
          if (result.success) {
            setUploadStatus('success');
            setMessage(`文件已成功上传到: ${currentConfig.targetPath}/${fileName}`);
          } else {
            setUploadStatus('error');
            setMessage(result.message || '上传失败，请检查配置信息');
          }
        } catch (error) {
          safeLog.error('网络请求失败', error);
          setUploadStatus('error');

          let errorMessage = '上传失败: ';
          if (error instanceof Error) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
              errorMessage += '网络连接失败，请检查网络连接或稍后重试';
            } else if (error.message.includes('CORS')) {
              errorMessage += '跨域请求被阻止，请联系管理员检查服务器配置';
            } else if (error.message.includes('HTTP')) {
              errorMessage += error.message;
            } else {
              errorMessage += '网络错误，请稍后重试';
            }
          } else {
            errorMessage += '未知网络错误';
          }

          setMessage(errorMessage);
        }
      };
      
      reader.readAsDataURL(pdfBlob);
      
    } catch (error) {
      setUploadStatus('error');
      setMessage('PDF生成失败，请重试');
      safeLog.error('PDF生成失败', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Cloud className="h-6 w-6 text-blue-600" />
            推送至图书馆
          </h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 报告信息 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">报告信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">公司名称:</span>
                <p className="text-gray-600">{formData.companyName}</p>
              </div>
              <div>
                <span className="font-medium">联系人:</span>
                <p className="text-gray-600">{formData.contactPerson}</p>
              </div>
              <div>
                <span className="font-medium">报告日期:</span>
                <p className="text-gray-600">{formData.reportDate}</p>
              </div>
              <div>
                <span className="font-medium">查询码:</span>
                <p className="text-gray-600">{formData.queryCode}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 推送状态 */}
        {config && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">推送目标</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">服务器:</span> {config.serverUrl}</p>
                <p><span className="font-medium">目标路径:</span> {config.targetPath}</p>
                <p><span className="font-medium">文件名:</span> {formData.companyName}_{formData.salesperson || '未指定'}_{formData.reportDate}.pdf</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 状态消息 */}
        {message && (
          <Alert className={`mb-6 ${
            uploadStatus === 'success' ? 'border-green-200 bg-green-50' :
            uploadStatus === 'error' ? 'border-red-200 bg-red-50' :
            'border-blue-200 bg-blue-50'
          }`}>
            {uploadStatus === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : uploadStatus === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <Cloud className="h-4 w-4 text-blue-600" />
            )}
            <AlertDescription className={
              uploadStatus === 'success' ? 'text-green-800' :
              uploadStatus === 'error' ? 'text-red-800' :
              'text-blue-800'
            }>
              {message}
            </AlertDescription>
          </Alert>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button
            onClick={handlePushToNextcloud}
            disabled={isUploading || !config}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                推送到图书馆
              </>
            )}
          </Button>
          
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>

        {/* 使用说明 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">使用说明:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Nextcloud配置由管理员统一管理</li>
            <li>• 点击&ldquo;推送到图书馆&rdquo;将PDF报告上传到指定目录</li>
            <li>• 文件名格式：公司名称_业务员_日期.pdf</li>
            <li>• 如需修改配置，请联系系统管理员</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
