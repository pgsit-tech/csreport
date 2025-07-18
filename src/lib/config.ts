// API配置
export const API_CONFIG = {
  // 使用自定义域名解决国内网络访问问题
  baseUrl: process.env.NODE_ENV === 'production'
    ? 'https://csreport-api.20990909.xyz'
    : '',
  
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
  return `${API_CONFIG.baseUrl}${API_CONFIG.endpoints[endpoint]}`;
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
