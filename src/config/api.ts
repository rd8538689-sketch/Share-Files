export const API_CONFIG = {
  baseURL: (globalThis as any).import?.meta?.env?.VITE_API_URL || 'http://localhost:3000',
  wsURL: (globalThis as any).import?.meta?.env?.VITE_WS_URL || 'ws://localhost:3000',
  timeout: 30000,
};

export const getApiUrl = (endpoint: string) => {
  return `${API_CONFIG.baseURL}${endpoint}`;
};

export const getWsUrl = (path: string = '') => {
  return `${API_CONFIG.wsURL}${path}`;
};

export const fetchWithConfig = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const url = getApiUrl(endpoint);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
};
