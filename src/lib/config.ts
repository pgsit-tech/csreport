// 日志控制配置
const LOG_CONFIG = {
  // 在生产环境中禁用详细日志
  enableDetailedLogs: process.env.NODE_ENV === 'development',
  // 只保留基础错误日志
  enableErrorLogs: true,
  // 进一步简化，只在开发环境显示信息和警告
  enableInfoLogs: process.env.NODE_ENV === 'development'
};

// 安全的日志函数 - 简化版，只保留错误日志
export const safeLog = {
  info: (message: string, ...args: unknown[]) => {
    // 生产环境不显示信息日志
    if (LOG_CONFIG.enableInfoLogs) {
      console.log(message, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    // 生产环境不显示警告日志
    if (LOG_CONFIG.enableInfoLogs) {
      console.warn(message, ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    if (LOG_CONFIG.enableErrorLogs) {
      // 在生产环境中，只记录基础错误信息
      if (LOG_CONFIG.enableDetailedLogs) {
        console.error(message, ...args);
      } else {
        console.error('操作失败，请稍后重试');
      }
    }
  },
  // 开发调试日志，生产环境完全不显示
  debug: (message: string, data?: unknown) => {
    if (LOG_CONFIG.enableDetailedLogs) {
      if (data) {
        console.log(`🔍 ${message}:`, data);
      } else {
        console.log(`🔍 ${message}`);
      }
    }
  }
};

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
    nextcloudUpload: '/api/nextcloud/upload',
    nextcloudConfig: '/api/nextcloud/config',
    nextcloudTest: '/api/nextcloud/test',
    adminForms: '/api/admin/forms',
    adminExport: '/api/admin/export',
    adminStats: '/api/admin/stats',
    adminCleanup: '/api/admin/cleanup',
    adminSettings: '/api/admin/settings',
    adminChangePassword: '/api/admin/change-password',
    health: '/health'
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
  const timeoutMs = 15000; // 增加到15秒超时

  // 增强的请求选项
  const enhancedOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
      ...options.headers,
    },
    mode: 'cors',
    credentials: 'omit', // 暂时禁用凭据以排除CORS问题
  };

  safeLog.info(`🚀 API调用: ${endpoint}`, {
    method: options.method || 'GET'
  });

  try {
    // 首先尝试自定义域名
    safeLog.info('🔗 尝试连接自定义域名');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(primaryUrl, {
      ...enhancedOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    safeLog.info(`📡 自定义域名响应: ${response.status}`);

    if (response.ok) {
      safeLog.info('✅ 自定义域名连接成功');
      return response;
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  } catch {
    safeLog.warn('⚠️ 自定义域名连接失败，尝试备用域名');

    try {
      // 回退到 workers.dev 域名
      safeLog.info('🔗 尝试连接备用域名');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(fallbackUrl, {
        ...enhancedOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      safeLog.info(`📡 备用域名响应: ${response.status}`);

      if (response.ok) {
        safeLog.info('✅ 备用域名连接成功');
        return response;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    } catch {
      safeLog.error('❌ 所有API端点都无法连接');
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
