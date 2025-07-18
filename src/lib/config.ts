// API配置
export const API_CONFIG = {
  // 主要API URL（自定义域名）
  primaryBaseUrl: 'https://csreport-api.20990909.xyz',
  // 备用API URL（workers.dev域名）
  fallbackBaseUrl: 'https://cs-report-worker.itsupport-5c8.workers.dev',
  // 开发环境
  devBaseUrl: '',

  endpoints: {
    submit: '/api/submit',
    query: '/api/query',
    sendEmail: '/api/send-email',
    adminForms: '/api/admin/forms',
    adminExport: '/api/admin/export'
  }
};

// 获取完整的API URL
export function getApiUrl(endpoint: keyof typeof API_CONFIG.endpoints): string {
  if (process.env.NODE_ENV === 'development') {
    return `${API_CONFIG.devBaseUrl}${API_CONFIG.endpoints[endpoint]}`;
  }
  return `${API_CONFIG.primaryBaseUrl}${API_CONFIG.endpoints[endpoint]}`;
}

// 带回退机制的API调用函数
export async function fetchWithFallback(
  endpoint: keyof typeof API_CONFIG.endpoints,
  options: RequestInit = {},
  queryParams?: string
): Promise<Response> {
  const endpointPath = API_CONFIG.endpoints[endpoint];
  const queryString = queryParams ? `?${queryParams}` : '';
  const primaryUrl = `${API_CONFIG.primaryBaseUrl}${endpointPath}${queryString}`;
  const fallbackUrl = `${API_CONFIG.fallbackBaseUrl}${endpointPath}${queryString}`;

  // 设置超时时间
  const timeoutMs = 10000; // 10秒超时

  try {
    // 首先尝试自定义域名
    console.log('尝试连接自定义域名:', primaryUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(primaryUrl, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log('自定义域名连接成功');
      return response;
    }
    throw new Error(`HTTP ${response.status}`);

  } catch (error) {
    console.warn('自定义域名连接失败，尝试备用域名:', error);

    try {
      // 回退到 workers.dev 域名
      console.log('尝试连接备用域名:', fallbackUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(fallbackUrl, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log('备用域名连接成功');
        return response;
      }
      throw new Error(`HTTP ${response.status}`);

    } catch (fallbackError) {
      console.error('所有API端点都无法连接:', fallbackError);
      throw new Error('无法连接到服务器，请检查网络连接或稍后重试');
    }
  }
}

// 开发环境配置
export const DEV_CONFIG = {
  // 开发环境下的模拟数据
  mockData: true,
  // 开发环境下的延迟（毫秒）
  mockDelay: 1000
};

// 生产环境配置
export const PROD_CONFIG = {
  // Cloudflare Worker域名
  workerDomain: 'your-worker.your-domain.workers.dev',
  // Pages域名
  pagesDomain: 'your-project.pages.dev'
};
