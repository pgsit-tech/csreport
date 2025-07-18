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
  FileText
} from 'lucide-react';

interface AdminStats {
  totalForms: number;
  todayForms: number;
  thisWeekForms: number;
  thisMonthForms: number;
}

export default function AdminPage() {
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

  useEffect(() => {
    fetchForms();
  }, []);

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
      const apiUrl = process.env.NODE_ENV === 'production'
        ? 'https://your-worker.your-domain.workers.dev/api/admin/forms'
        : '/api/admin/forms';

      const response = await fetch(apiUrl);
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
      const apiUrl = process.env.NODE_ENV === 'production'
        ? 'https://your-worker.your-domain.workers.dev/api/admin/export'
        : '/api/admin/export';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forms: filteredForms }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `客户报告导出_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">管理后台</h1>
          <p className="text-gray-600">查看和管理所有客户报告</p>
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
                <Button onClick={handleExportAll} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  导出Excel
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
                    <TableHead>查询码</TableHead>
                    <TableHead>公司名称</TableHead>
                    <TableHead>联系人</TableHead>
                    <TableHead>手机号</TableHead>
                    <TableHead>报告日期</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredForms.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-mono text-sm">
                        {form.queryCode}
                      </TableCell>
                      <TableCell className="font-medium">
                        {form.companyName}
                      </TableCell>
                      <TableCell>{form.contactPerson}</TableCell>
                      <TableCell>{form.mobile}</TableCell>
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
