'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Database, AlertTriangle, BarChart3 } from 'lucide-react';
import { fetchWithFallback } from '@/lib/config';

interface DatabaseStats {
  totalForms: number;
  todayForms: number;
  weekForms: number;
  monthForms: number;
  oldestRecord: string;
  newestRecord: string;
}

interface DataCleanupProps {
  onClose: () => void;
}

export default function DataCleanup({ onClose }: DataCleanupProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning'>('success');

  // 密码验证
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = 'Sz@pgsit123';

    if (password === correctPassword) {
      setIsAuthenticated(true);
      setAuthError('');
      setPassword(''); // 清空密码输入
    } else {
      setAuthError('密码错误，请重新输入');
      setPassword('');
    }
  };

  // 获取数据库统计信息
  const fetchStats = async () => {
    try {
      const response = await fetchWithFallback('adminStats');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch {
      console.error('获取统计信息失败');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]);

  // 执行数据清理
  const handleCleanup = async (action: string, actionName: string) => {
    if (!confirmCode) {
      setMessage('请输入确认码');
      setMessageType('error');
      return;
    }

    const confirmed = window.confirm(
      `确定要执行 "${actionName}" 操作吗？\n\n此操作不可撤销！\n\n请确保您已经备份了重要数据。`
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await fetchWithFallback('adminCleanup', {
        method: 'POST',
        body: JSON.stringify({
          confirmCode,
          action
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.data.message);
        setMessageType('success');
        setConfirmCode(''); // 清空确认码
        await fetchStats(); // 刷新统计信息
      } else {
        setMessage(data.message || '操作失败');
        setMessageType('error');
      }
    } catch {
      setMessage('网络错误，请稍后重试');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // 如果未认证，显示密码输入界面
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-red-600">
              <Database className="h-6 w-6" />
              数据清理验证
            </h2>
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
          </div>

          {/* 安全警告 */}
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>高级管理功能：</strong>此功能仅限授权管理员使用，请输入管理密码。
            </AlertDescription>
          </Alert>

          {/* 密码输入表单 */}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label htmlFor="adminPassword">管理密码</Label>
              <Input
                id="adminPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入数据清理管理密码"
                className="mt-1"
                autoFocus
              />
              {authError && (
                <p className="text-red-500 text-sm mt-1">{authError}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={!password}>
              验证并进入
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-500">
            <p>此功能包含危险操作，请谨慎使用</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-red-600">
            <Database className="h-6 w-6" />
            数据清理管理
          </h2>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>

        {/* 警告提示 */}
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>危险操作警告：</strong>数据清理操作不可撤销！请在执行前确保已备份重要数据。
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 数据库统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                数据库统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>总表单数：</span>
                    <span className="font-bold">{stats.totalForms}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>今日表单：</span>
                    <span className="font-bold">{stats.todayForms}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>本周表单：</span>
                    <span className="font-bold">{stats.weekForms}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>本月表单：</span>
                    <span className="font-bold">{stats.monthForms}</span>
                  </div>
                  {stats.oldestRecord && (
                    <div className="flex justify-between text-sm">
                      <span>最早记录：</span>
                      <span>{new Date(stats.oldestRecord).toLocaleDateString()}</span>
                    </div>
                  )}
                  {stats.newestRecord && (
                    <div className="flex justify-between text-sm">
                      <span>最新记录：</span>
                      <span>{new Date(stats.newestRecord).toLocaleDateString()}</span>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchStats}
                    className="w-full mt-4"
                  >
                    刷新统计
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">加载统计信息...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 清理操作 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                清理操作
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 确认码输入 */}
                <div>
                  <Label htmlFor="confirmCode">确认码 *</Label>
                  <Input
                    id="confirmCode"
                    type="password"
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value)}
                    placeholder="请输入确认码"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    确认码：CLEANUP_CONFIRM_2025
                  </p>
                </div>

                {/* 清理选项 */}
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => handleCleanup('clear_test', '清理测试数据')}
                    disabled={loading || !confirmCode}
                    className="w-full justify-start"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    清理测试数据
                    <span className="text-xs text-gray-500 ml-auto">
                      (包含&ldquo;测试&rdquo;或&ldquo;test&rdquo;的记录)
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleCleanup('clear_old', '清理30天前数据')}
                    disabled={loading || !confirmCode}
                    className="w-full justify-start"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    清理30天前数据
                    <span className="text-xs text-gray-500 ml-auto">
                      (30天前的所有记录)
                    </span>
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => handleCleanup('clear_all', '清空所有数据')}
                    disabled={loading || !confirmCode}
                    className="w-full justify-start"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    清空所有数据
                    <span className="text-xs ml-auto">
                      (删除所有表单记录)
                    </span>
                  </Button>
                </div>

                {loading && (
                  <div className="text-center py-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">正在执行清理操作...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 操作结果消息 */}
        {message && (
          <Alert className={`mt-6 ${
            messageType === 'success' ? 'border-green-200 bg-green-50' :
            messageType === 'error' ? 'border-red-200 bg-red-50' :
            'border-yellow-200 bg-yellow-50'
          }`}>
            <AlertDescription className={
              messageType === 'success' ? 'text-green-800' :
              messageType === 'error' ? 'text-red-800' :
              'text-yellow-800'
            }>
              {message}
            </AlertDescription>
          </Alert>
        )}

        {/* 使用说明 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">使用说明</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p><strong>清理测试数据：</strong>删除公司名称或联系人包含&ldquo;测试&rdquo;、&ldquo;test&rdquo;关键词的记录</p>
            <p><strong>清理30天前数据：</strong>删除创建时间在30天前的所有记录</p>
            <p><strong>清空所有数据：</strong>删除数据库中的所有表单记录（极度危险）</p>
            <p className="text-red-600"><strong>重要：</strong>所有清理操作都是不可撤销的，请谨慎操作！</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
