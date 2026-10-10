const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export interface AuthResponse {
  userId: number;
  username: string;
  nickname: string;
  token?: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('登录已过期，请重新登录');
  }

  const result = await response.json();

  if (result.code !== 200) {
    throw new Error(result.message || `请求失败 (code: ${result.code})`);
  }

  return result.data as T;
}

export interface LoginDTO {
  username: string;
  password: string;
}

export interface RegisterDTO {
  username: string;
  password: string;
  nickname?: string;
  email?: string;
}

export const login = (data: LoginDTO): Promise<AuthResponse> => {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(data) });
};

export const register = (data: RegisterDTO): Promise<AuthResponse> => {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(data) });
};

export const guestLogin = (): Promise<AuthResponse> => {
  return request('/auth/guest', { method: 'POST' });
};

export const getMe = (): Promise<AuthResponse> => {
  return request('/auth/me');
};
