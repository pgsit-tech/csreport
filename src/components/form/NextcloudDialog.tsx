'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Cloud, Upload, Settings, X, CheckCircle, AlertCircle } from 'lucide-react';
import { FormData } from '@/types/form';
import { generatePDF } from '@/lib/pdf-generator';
import { fetchWithFallback } from '@/lib/config';

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
  const [config, setConfig] = useState<NextcloudConfig>({
    serverUrl: 'https://your-nextcloud.com',
    username: '',
    password: '',
    targetPath: '/图书馆/业务报告'
  });
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  // 处理配置更新
  const handleConfigChange = (field: keyof NextcloudConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 推送到Nextcloud
  const handlePushToNextcloud = async () => {
    if (!config.serverUrl || !config.username || !config.password) {
      setMessage('请填写完整的Nextcloud配置信息');
      setUploadStatus('error');
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
          
          // 调用后端API上传到Nextcloud
          const response = await fetchWithFallback('nextcloudUpload', {
            method: 'POST',
            body: JSON.stringify({
              config,
              fileName,
              fileContent: base64Content,
              formData
            })
          });

          const result = await response.json();
          
          if (result.success) {
            setUploadStatus('success');
            setMessage(`文件已成功上传到: ${config.targetPath}/${fileName}`);
          } else {
            setUploadStatus('error');
            setMessage(result.message || '上传失败，请检查配置信息');
          }
        } catch (error) {
          setUploadStatus('error');
          setMessage('网络错误，请稍后重试');
          console.error('Upload error:', error);
        }
      };
      
      reader.readAsDataURL(pdfBlob);
      
    } catch (error) {
      setUploadStatus('error');
      setMessage('PDF生成失败，请重试');
      console.error('PDF generation error:', error);
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

        {/* Nextcloud配置 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Nextcloud配置
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfig(!showConfig)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {showConfig ? '隐藏配置' : '显示配置'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showConfig ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="serverUrl">服务器地址</Label>
                  <Input
                    id="serverUrl"
                    value={config.serverUrl}
                    onChange={(e) => handleConfigChange('serverUrl', e.target.value)}
                    placeholder="https://your-nextcloud.com"
                    className="mt-1"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">用户名</Label>
                    <Input
                      id="username"
                      value={config.username}
                      onChange={(e) => handleConfigChange('username', e.target.value)}
                      placeholder="nextcloud用户名"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">密码</Label>
                    <Input
                      id="password"
                      type="password"
                      value={config.password}
                      onChange={(e) => handleConfigChange('password', e.target.value)}
                      placeholder="nextcloud密码"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="targetPath">目标路径</Label>
                  <Input
                    id="targetPath"
                    value={config.targetPath}
                    onChange={(e) => handleConfigChange('targetPath', e.target.value)}
                    placeholder="/图书馆/业务报告"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    文件将上传到此路径下，路径必须以 / 开头
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                <p>服务器: {config.serverUrl}</p>
                <p>用户: {config.username || '未设置'}</p>
                <p>路径: {config.targetPath}</p>
              </div>
            )}
          </CardContent>
        </Card>

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
            disabled={isUploading || !config.username || !config.password}
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
            <li>• 配置您的Nextcloud服务器信息</li>
            <li>• 设置目标上传路径（如：/图书馆/业务报告）</li>
            <li>• 点击&ldquo;推送到图书馆&rdquo;将PDF报告上传到指定目录</li>
            <li>• 文件名格式：公司名称_业务员_日期.pdf</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
