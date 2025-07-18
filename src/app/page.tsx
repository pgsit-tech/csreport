'use client';

import { useState } from 'react';
import { FormData } from '@/types/form';
import { ReportForm } from '@/components/form/ReportForm';
import { QueryForm } from '@/components/form/QueryForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Search, Plus } from 'lucide-react';
import { getApiUrl } from '@/lib/config';

export default function Home() {
  const [currentView, setCurrentView] = useState<'new' | 'query'>('new');
  const [queryResult, setQueryResult] = useState<FormData | null>(null);

  const handleSubmitForm = async (formData: FormData): Promise<{ success: boolean; queryCode?: string; message?: string }> => {
    try {
      const response = await fetch(getApiUrl('submit'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('提交失败:', error);
      return { success: false, message: '提交失败，请重试' };
    }
  };

  const handleQueryResult = (data: FormData | null) => {
    setQueryResult(data);
    if (data) {
      setCurrentView('new'); // 切换到表单视图显示查询结果
    }
  };

  const handleNewForm = () => {
    setQueryResult(null);
    setCurrentView('new');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* 头部 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">业务员见客报告系统</h1>
          <p className="text-gray-600">创建、查询和管理客户拜访报告</p>
        </div>

        {/* 导航按钮 */}
        <div className="flex justify-center gap-4 mb-8">
          <Button
            onClick={handleNewForm}
            variant={currentView === 'new' && !queryResult ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            新建报告
          </Button>
          <Button
            onClick={() => setCurrentView('query')}
            variant={currentView === 'query' ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            查询报告
          </Button>
        </div>

        {/* 主要内容区域 */}
        <div className="max-w-6xl mx-auto">
          {currentView === 'query' && !queryResult ? (
            <QueryForm onQueryResult={handleQueryResult} />
          ) : (
            <ReportForm
              initialData={queryResult || undefined}
              onSubmit={handleSubmitForm}
            />
          )}
        </div>

        {/* 功能说明 */}
        <div className="mt-12 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">系统功能</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <h3 className="font-semibold mb-2">表单管理</h3>
                  <p className="text-sm text-gray-600">
                    创建和编辑客户拜访报告，支持自定义查询码
                  </p>
                </div>
                <div className="text-center">
                  <Search className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <h3 className="font-semibold mb-2">快速查询</h3>
                  <p className="text-sm text-gray-600">
                    通过查询码快速检索和查看历史报告
                  </p>
                </div>
                <div className="text-center">
                  <div className="h-8 w-8 mx-auto mb-2 bg-purple-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">PDF</span>
                  </div>
                  <h3 className="font-semibold mb-2">导出分享</h3>
                  <p className="text-sm text-gray-600">
                    一键导出PDF文件或通过邮件发送报告
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
