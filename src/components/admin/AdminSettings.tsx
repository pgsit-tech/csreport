'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, User, Lock, Save } from 'lucide-react';

interface AdminInfo {
  username: string;
  email: string;
  systemName: string;
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
  
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
