'use client';

import { useState, useEffect } from 'react';
import { FormData } from '@/types/form';
import { ReportForm } from '@/components/form/ReportForm';
import { QueryForm } from '@/components/form/QueryForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Search, Plus } from 'lucide-react';
import { fetchWithFallback } from '@/lib/config';
import { formDataToDbFormat } from '@/lib/utils';

export default function Home() {
  const [currentView, setCurrentView] = useState<'new' | 'query'>('new');
  const [queryResult, setQueryResult] = useState<FormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 设置页面标题
  useEffect(() => {
    const systemName = localStorage.getItem('system_name') || '业务员见客报告系统';
    document.title = systemName;
  }, []);

  // 检查 URL 参数，如果有查询码则自动查询
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryCode = urlParams.get('code');
    const viewMode = urlParams.get('view');

    if (queryCode) {
      setIsLoading(true);
      handleAutoQuery(queryCode, viewMode === 'readonly');
    }
  }, []);

  // 自动查询函数
  const handleAutoQuery = async (queryCode: string, readonly: boolean = false) => {
    try {
      const response = await fetchWithFallback('query', {}, `code=${encodeURIComponent(queryCode)}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setQueryResult(data.data);
          setCurrentView('new'); // 显示表单视图

          // 如果是只读模式，可以添加额外的状态标识
          if (readonly) {
            // 可以在这里设置只读状态
            console.log('只读模式查看表单');
          }
        } else {
          alert('未找到对应的报告记录');
        }
      } else {
        alert('查询失败，请检查查询码是否正确');
      }
    } catch (error) {
      console.error('自动查询失败:', error);
      alert('查询失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitForm = async (formData: FormData): Promise<{ success: boolean; queryCode?: string; message?: string }> => {
    try {
      // 转换表单数据为数据库格式
      const dbData = formDataToDbFormat(formData as unknown as Record<string, unknown>);
      console.log('🔄 转换后的数据库格式:', dbData);

      const response = await fetchWithFallback('submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dbData),
      });

      const result = await response.json();
      console.log('📡 API响应结果:', result);
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

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载报告...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* 头部 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {typeof window !== 'undefined' ? (localStorage.getItem('system_name') || '业务员见客报告系统') : '业务员见客报告系统'}
          </h1>
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
