'use client';

import { useState, useEffect } from 'react';
import { FormData } from '@/types/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Download,
  Search,
  Eye,
  Calendar,
  Building,
  User,
  FileText,
  Settings,
  LogOut,
  Database
} from 'lucide-react';
import { fetchWithFallback } from '@/lib/config';
import LoginForm from '@/components/admin/LoginForm';
import AdminSettings from '@/components/admin/AdminSettings';
import DataCleanup from '@/components/admin/DataCleanup';
import { exportFormsAsZip, exportAllFormsAsZip, exportSingleFormAsPDF } from '@/lib/batch-pdf-export';

interface AdminStats {
  totalForms: number;
  todayForms: number;
  thisWeekForms: number;
  thisMonthForms: number;
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDataCleanup, setShowDataCleanup] = useState(false);
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [forms, setForms] = useState<FormData[]>([]);
  const [filteredForms, setFilteredForms] = useState<FormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<AdminStats>({
    totalForms: 0,
    todayForms: 0,
    thisWeekForms: 0,
    thisMonthForms: 0
  });

  // 检查登录状态
  useEffect(() => {
    const loginStatus = localStorage.getItem('admin_logged_in');
    setIsLoggedIn(loginStatus === 'true');
  }, []);

  // 设置页面标题
  useEffect(() => {
    const systemName = localStorage.getItem('system_name') || '业务员见客报告系统';
    document.title = `${systemName} - 管理后台`;
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchForms();
    }
  }, [isLoggedIn]);

  // 登录处理
  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    // 简单的本地验证，实际项目中应该调用后端API
    const storedUsername = localStorage.getItem('admin_username') || 'admin';
    const storedPassword = localStorage.getItem('admin_password') || 'admin123';

    if (username === storedUsername && password === storedPassword) {
      localStorage.setItem('admin_logged_in', 'true');
      setIsLoggedIn(true);
      return true;
    }
    return false;
  };

  // 登出处理
  const handleLogout = () => {
    localStorage.setItem('admin_logged_in', 'false');
    setIsLoggedIn(false);
    setSelectedForms([]);
  };

  // 选择表单处理
  const handleSelectForm = (formId: string) => {
    setSelectedForms(prev =>
      prev.includes(formId)
        ? prev.filter(id => id !== formId)
        : [...prev, formId]
    );
  };

  const handleSelectAll = () => {
    if (selectedForms.length === filteredForms.length) {
      setSelectedForms([]);
    } else {
      setSelectedForms(filteredForms.map(form => form.id).filter((id): id is string => Boolean(id)));
    }
  };

  useEffect(() => {
    // 过滤表单数据
    const filtered = forms.filter(form => 
      form.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.queryCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.mobile.includes(searchTerm)
    );
    setFilteredForms(filtered);
  }, [forms, searchTerm]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await fetchWithFallback('adminForms');
      const result = await response.json();

      if (result.success) {
        setForms(result.data);
        setStats(result.stats);
      }
    } catch (error) {
      console.error('获取表单数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    try {
      if (filteredForms.length === 0) {
        alert('没有数据可导出');
        return;
      }

      // 显示加载提示
      console.log('正在生成PDF文件，请稍候...');

      // 使用前端PDF生成和压缩功能
      await exportAllFormsAsZip(filteredForms);

    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  };

  // 批量导出选中的表单
  const handleExportSelected = async () => {
    if (selectedForms.length === 0) {
      alert('请先选择要导出的表单');
      return;
    }

    try {
      const selectedFormData = forms.filter(form => form.id && selectedForms.includes(form.id));

      if (selectedFormData.length === 0) {
        alert('没有找到选中的表单数据');
        return;
      }

      // 根据选择数量决定导出方式
      if (selectedFormData.length === 1) {
        console.log('正在生成单个PDF文件...');
        await exportSingleFormAsPDF(selectedFormData[0]);
      } else {
        console.log(`正在生成${selectedFormData.length}个PDF文件并打包成ZIP...`);
        await exportFormsAsZip(selectedFormData);
      }

    } catch (error) {
      console.error('批量导出失败:', error);
      alert('批量导出失败，请重试');
    }
  };

  const handleViewForm = (form: FormData) => {
    // 在新窗口中打开表单详情
    const queryParams = new URLSearchParams({
      code: form.queryCode || '',
      view: 'readonly'
    });
    window.open(`/?${queryParams.toString()}`, '_blank');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 如果未登录，显示登录页面
  if (!isLoggedIn) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // 如果显示设置页面
  if (showSettings) {
    return <AdminSettings onClose={() => setShowSettings(false)} />;
  }

  // 如果显示数据清理页面
  if (showDataCleanup) {
    return <DataCleanup onClose={() => setShowDataCleanup(false)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* 头部 */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {localStorage.getItem('system_name') || '业务员见客报告系统'} - 管理后台
            </h1>
            <p className="text-gray-600">查看和管理所有客户报告</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDataCleanup(true)}>
              <Database className="h-4 w-4 mr-2" />
              数据清理
            </Button>
            <Button variant="outline" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4 mr-2" />
              设置
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              登出
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">总报告数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalForms}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">今日新增</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.todayForms}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">本周新增</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.thisWeekForms}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <User className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">本月新增</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.thisMonthForms}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 操作栏 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="搜索公司名称、联系人、查询码或手机号..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {selectedForms.length > 0 && (
                  <Button onClick={handleExportSelected} variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    导出选中PDF ({selectedForms.length})
                  </Button>
                )}
                <Button onClick={handleExportAll} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  导出全部PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 表单列表 */}
        <Card>
          <CardHeader>
            <CardTitle>
              客户报告列表 ({filteredForms.length} 条记录)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedForms.length === filteredForms.length && filteredForms.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>查询码</TableHead>
                    <TableHead>公司名称</TableHead>
                    <TableHead>联系人</TableHead>
                    <TableHead>手机号</TableHead>
                    <TableHead>业务员</TableHead>
                    <TableHead>报告日期</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredForms.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={form.id ? selectedForms.includes(form.id) : false}
                          onChange={() => form.id && handleSelectForm(form.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {form.queryCode}
                      </TableCell>
                      <TableCell className="font-medium">
                        {form.companyName}
                      </TableCell>
                      <TableCell>{form.contactPerson}</TableCell>
                      <TableCell>{form.mobile}</TableCell>
                      <TableCell>{form.salesperson || '未指定'}</TableCell>
                      <TableCell>{form.reportDate}</TableCell>
                      <TableCell>{formatDate(form.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewForm(form)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          查看
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredForms.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm ? '没有找到匹配的记录' : '暂无数据'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
