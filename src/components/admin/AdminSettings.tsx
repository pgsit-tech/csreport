'use client';

import { useState, useEffect } from 'react';
import { fetchWithFallback } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, User, Lock, Save, Cloud } from 'lucide-react';

interface AdminInfo {
  username: string;
  email: string;
  systemName: string;
}

interface NextcloudConfig {
  serverUrl: string;
  username: string;
  password: string;
  targetPath: string;
  enabled: boolean;
}

interface AdminSettingsProps {
  onClose: () => void;
}

export default function AdminSettings({ onClose }: AdminSettingsProps) {
  const [adminInfo, setAdminInfo] = useState<AdminInfo>({
    username: localStorage.getItem('admin_username') || 'admin',
    email: localStorage.getItem('admin_email') || 'admin@example.com',
    systemName: localStorage.getItem('system_name') || '业务员见客报告系统'
  });

  const [nextcloudConfig, setNextcloudConfig] = useState<NextcloudConfig>({
    serverUrl: '',
    username: '',
    password: '',
    targetPath: '/图书馆/业务报告',
    enabled: false
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 加载Nextcloud配置
  useEffect(() => {
    loadNextcloudConfig();
  }, []);

  const loadNextcloudConfig = async () => {
    try {
      const response = await fetchWithFallback('nextcloudConfig');
      const result = await response.json();

      if (result.success && result.data) {
        setNextcloudConfig({
          serverUrl: result.data.serverUrl,
          username: result.data.username,
          password: '', // 密码需要重新输入
          targetPath: result.data.uploadPath,
          enabled: true
        });
      }
    } catch (error) {
      console.error('加载Nextcloud配置失败:', error);
      // 如果加载失败，保持默认状态
    }
  };

  const handleInfoUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // 保存到本地存储
      localStorage.setItem('admin_username', adminInfo.username);
      localStorage.setItem('admin_email', adminInfo.email);
      localStorage.setItem('system_name', adminInfo.systemName);
      
      // 这里可以添加后端API调用来保存设置
      // await fetchWithFallback('/api/admin/settings', {
      //   method: 'POST',
      //   body: JSON.stringify(adminInfo)
      // });
      
      setMessage('个人信息更新成功！');

      // 刷新页面以应用系统名称更改
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      setMessage('更新失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleNextcloudUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (nextcloudConfig.enabled) {
        // 验证必要字段
        if (!nextcloudConfig.serverUrl || !nextcloudConfig.username || !nextcloudConfig.password) {
          setMessage('请填写完整的Nextcloud配置信息');
          setLoading(false);
          return;
        }

        // 保存到数据库
        const response = await fetchWithFallback('nextcloudConfig', {
          method: 'POST',
          body: JSON.stringify({
            serverUrl: nextcloudConfig.serverUrl,
            username: nextcloudConfig.username,
            password: nextcloudConfig.password,
            uploadPath: nextcloudConfig.targetPath
          })
        });

        const result = await response.json();

        if (result.success) {
          setMessage('Nextcloud配置已保存到数据库');
        } else {
          setMessage(result.message || '保存失败');
        }
      } else {
        setMessage('Nextcloud功能已禁用');
      }
    } catch (error) {
      console.error('保存Nextcloud配置失败:', error);
      setMessage('配置更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage('新密码和确认密码不匹配');
      setLoading(false);
      return;
    }

    if (passwords.newPassword.length < 6) {
      setMessage('新密码长度至少为6位');
      setLoading(false);
      return;
    }

    try {
      // 验证当前密码
      const currentStoredPassword = localStorage.getItem('admin_password') || 'admin123';
      if (passwords.currentPassword !== currentStoredPassword) {
        setMessage('当前密码错误');
        setLoading(false);
        return;
      }

      // 保存新密码
      localStorage.setItem('admin_password', passwords.newPassword);
      
      // 这里可以添加后端API调用来保存密码
      // await fetchWithFallback('/api/admin/change-password', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     currentPassword: passwords.currentPassword,
      //     newPassword: passwords.newPassword
      //   })
      // });
      
      setMessage('密码修改成功！');
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch {
      setMessage('密码修改失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            管理员设置
          </h2>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>

        <div className="space-y-6">
          {/* 个人信息设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                个人信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInfoUpdate} className="space-y-4">
                <div>
                  <Label htmlFor="username">用户名</Label>
                  <Input
                    id="username"
                    value={adminInfo.username}
                    onChange={(e) => setAdminInfo({...adminInfo, username: e.target.value})}
                    placeholder="请输入用户名"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={adminInfo.email}
                    onChange={(e) => setAdminInfo({...adminInfo, email: e.target.value})}
                    placeholder="请输入邮箱地址"
                  />
                </div>
                
                <div>
                  <Label htmlFor="systemName">系统名称</Label>
                  <Input
                    id="systemName"
                    value={adminInfo.systemName}
                    onChange={(e) => setAdminInfo({...adminInfo, systemName: e.target.value})}
                    placeholder="请输入系统名称"
                  />
                </div>
                
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  保存信息
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 密码修改 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                修改密码
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">当前密码</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({...passwords, currentPassword: e.target.value})}
                    placeholder="请输入当前密码"
                  />
                </div>
                
                <div>
                  <Label htmlFor="newPassword">新密码</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})}
                    placeholder="请输入新密码（至少6位）"
                  />
                </div>
                
                <div>
                  <Label htmlFor="confirmPassword">确认新密码</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})}
                    placeholder="请再次输入新密码"
                  />
                </div>
                
                <Button type="submit" disabled={loading}>
                  <Lock className="h-4 w-4 mr-2" />
                  修改密码
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Nextcloud配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Nextcloud图书馆配置
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNextcloudUpdate} className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    id="nextcloudEnabled"
                    checked={nextcloudConfig.enabled}
                    onChange={(e) => setNextcloudConfig({...nextcloudConfig, enabled: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="nextcloudEnabled">启用Nextcloud推送功能</Label>
                </div>

                <div>
                  <Label htmlFor="serverUrl">服务器地址</Label>
                  <Input
                    id="serverUrl"
                    value={nextcloudConfig.serverUrl}
                    onChange={(e) => setNextcloudConfig({...nextcloudConfig, serverUrl: e.target.value})}
                    placeholder="https://your-nextcloud.com"
                    disabled={!nextcloudConfig.enabled}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nextcloudUsername">用户名</Label>
                    <Input
                      id="nextcloudUsername"
                      value={nextcloudConfig.username}
                      onChange={(e) => setNextcloudConfig({...nextcloudConfig, username: e.target.value})}
                      placeholder="nextcloud用户名"
                      disabled={!nextcloudConfig.enabled}
                    />
                  </div>
                  <div>
                    <Label htmlFor="nextcloudPassword">密码</Label>
                    <Input
                      id="nextcloudPassword"
                      type="password"
                      value={nextcloudConfig.password}
                      onChange={(e) => setNextcloudConfig({...nextcloudConfig, password: e.target.value})}
                      placeholder="nextcloud密码"
                      disabled={!nextcloudConfig.enabled}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="targetPath">目标路径</Label>
                  <Input
                    id="targetPath"
                    value={nextcloudConfig.targetPath}
                    onChange={(e) => setNextcloudConfig({...nextcloudConfig, targetPath: e.target.value})}
                    placeholder="/图书馆/业务报告"
                    disabled={!nextcloudConfig.enabled}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    文件将上传到此路径下，路径必须以 / 开头
                  </p>
                </div>

                <Button type="submit" disabled={loading || !nextcloudConfig.enabled}>
                  <Save className="h-4 w-4 mr-2" />
                  保存配置
                </Button>
              </form>
            </CardContent>
          </Card>

          {message && (
            <div className={`text-center p-3 rounded ${
              message.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
