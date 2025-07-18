'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { querySchema, QueryValues } from '@/lib/schema';
import { FormData } from '@/types/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search } from 'lucide-react';
import { fetchWithFallback } from '@/lib/config';

interface QueryFormProps {
  onQueryResult: (data: FormData | null) => void;
}

export function QueryForm({ onQueryResult }: QueryFormProps) {
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<{ success: boolean; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<QueryValues>({
    resolver: zodResolver(querySchema)
  });

  const handleQuery = async (data: QueryValues) => {
    setIsQuerying(true);
    setQueryResult(null);

    try {
      // 使用带回退机制的API调用
      const response = await fetchWithFallback('query', {
        method: 'GET',
      }, `code=${encodeURIComponent(data.queryCode)}`);
      const result = await response.json();

      if (result.success && result.data) {
        setQueryResult({ success: true, message: '查询成功！' });
        onQueryResult(result.data);
      } else {
        setQueryResult({ success: false, message: result.message || '未找到相关记录' });
        onQueryResult(null);
      }
    } catch (error) {
      console.error('查询失败:', error);
      setQueryResult({ success: false, message: '查询失败，请重试' });
      onQueryResult(null);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleReset = () => {
    reset();
    setQueryResult(null);
    onQueryResult(null);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl text-center">查询表单记录</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleQuery)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="queryCode">查询码</Label>
            <Input
              id="queryCode"
              placeholder="请输入查询码"
              {...register('queryCode')}
              className={errors.queryCode ? 'border-red-500' : ''}
              disabled={isQuerying}
            />
            {errors.queryCode && (
              <p className="text-red-500 text-sm">{errors.queryCode.message}</p>
            )}
          </div>

          {queryResult && (
            <div className={`p-3 rounded-md ${queryResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm ${queryResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {queryResult.message}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isQuerying}
              className="flex-1"
            >
              {isQuerying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  查询中...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  查询
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isQuerying}
            >
              重置
            </Button>
          </div>
        </form>

        <div className="mt-4 text-sm text-gray-500">
          <p>提示：</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>查询码由系统自动生成或用户自定义</li>
            <li>查询码不区分大小写</li>
            <li>查询成功后可查看、编辑和导出表单</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
