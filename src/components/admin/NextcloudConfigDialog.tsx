'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchWithFallback } from '@/lib/config';
import { Settings, Save, TestTube } from 'lucide-react';

interface NextcloudConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NextcloudConfig {
  serverUrl: string;
  username: string;
  password: string;
  uploadPath: string;
}

export default function NextcloudConfigDialog({ isOpen, onClose }: NextcloudConfigDialogProps) {
  const [config, setConfig] = useState<NextcloudConfig>({
    serverUrl: '',
    username: '',
    password: '',
    uploadPath: '/CS Report'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  // 加载现有配置
  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const response = await fetchWithFallback('nextcloudConfig');
      const result = await response.json();
      
      if (result.success && result.data) {
        setConfig({
          serverUrl: result.data.serverUrl,
          username: result.data.username,
          password: '', // 密码需要重新输入
          uploadPath: result.data.uploadPath
        });
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      setMessage('加载配置失败');
      setMessageType('error');
    }
  };

  const handleSave = async () => {
    if (!config.serverUrl || !config.username || !config.password) {
      setMessage('请填写所有必填字段');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetchWithFallback('nextcloudConfig', {
        method: 'POST',
        body: JSON.stringify(config)
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage('配置保存成功');
        setMessageType('success');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setMessage(result.message || '保存失败');
        setMessageType('error');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      setMessage('保存配置失败，请重试');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    if (!config.serverUrl || !config.username || !config.password) {
      setMessage('请先填写完整的配置信息');
      setMessageType('error');
      return;
    }

    setIsTesting(true);
    setMessage('正在测试连接...');
    setMessageType('info');

    try {
      const response = await fetchWithFallback('nextcloudTest', {
        method: 'POST',
        body: JSON.stringify({
          serverUrl: config.serverUrl,
          username: config.username,
          password: config.password,
          targetPath: config.uploadPath
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage('连接测试成功！');
        setMessageType('success');
      } else {
        setMessage(result.message || '连接测试失败');
        setMessageType('error');
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      setMessage('测试连接失败，请检查网络和配置');
      setMessageType('error');
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Nextcloud配置</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="serverUrl">服务器地址 *</Label>
            <Input
              id="serverUrl"
              type="url"
              placeholder="https://your-nextcloud.com"
              value={config.serverUrl}
              onChange={(e) => setConfig({ ...config, serverUrl: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="username">用户名 *</Label>
            <Input
              id="username"
              type="text"
              placeholder="用户名"
              value={config.username}
              onChange={(e) => setConfig({ ...config, username: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="password">密码 *</Label>
            <Input
              id="password"
              type="password"
              placeholder="密码"
              value={config.password}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="uploadPath">上传路径</Label>
            <Input
              id="uploadPath"
              type="text"
              placeholder="/CS Report"
              value={config.uploadPath}
              onChange={(e) => setConfig({ ...config, uploadPath: e.target.value })}
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              messageType === 'success' ? 'bg-green-50 text-green-700' :
              messageType === 'error' ? 'bg-red-50 text-red-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {message}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleTest}
              disabled={isTesting || isLoading}
              variant="outline"
              className="flex-1"
            >
              {isTesting ? (
                <>
                  <TestTube className="mr-2 h-4 w-4 animate-spin" />
                  测试中...
                </>
              ) : (
                <>
                  <TestTube className="mr-2 h-4 w-4" />
                  测试连接
                </>
              )}
            </Button>

            <Button
              onClick={handleSave}
              disabled={isLoading || isTesting}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Save className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存配置
                </>
              )}
            </Button>
          </div>

          <Button variant="outline" onClick={onClose} className="w-full">
            关闭
          </Button>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p className="font-medium mb-1">配置说明：</p>
          <ul className="space-y-1">
            <li>• 服务器地址：Nextcloud服务器的完整URL</li>
            <li>• 用户名和密码：Nextcloud账户凭据</li>
            <li>• 上传路径：文件上传到的目录路径</li>
            <li>• 建议先测试连接再保存配置</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
