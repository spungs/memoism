import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { API_URL } from './config';

// 유효성 검사 함수들
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidUsername = (username: string): boolean => {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
};

const isValidPassword = (password: string): boolean => {
  return password.length >= 8;
};

// 타임아웃을 지원하는 fetch 함수
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.');
    }
    throw error;
  }
};

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  username: string;
}

export interface UpdateProfileData {
  username?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
}

export const useLogin = () => {
  const { setUser, setToken } = useAuthStore();

  return useMutation({
    mutationFn: async (data: LoginData): Promise<AuthResponse> => {
      try {
        const formData = new FormData();
        formData.append('username', data.email);
        formData.append('password', data.password);

        const response = await fetchWithTimeout(`${API_URL}/auth/token`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
          if (response.status === 401) {
            throw new Error('이메일 또는 비밀번호가 잘못되었습니다.');
          } else if (response.status >= 500) {
            throw new Error('서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
          } else {
            throw new Error(error.detail || '로그인에 실패했습니다.');
          }
        }

        return response.json();
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('네트워크 오류가 발생했습니다. 연결을 확인해주세요.');
      }
    },
    onSuccess: (data) => {
      setToken(data.access_token);
    },
    onError: (error) => {
      console.error('Login error:', error);
    },
  });
};

export const useSignup = () => {
  return useMutation({
    mutationFn: async (data: SignupData): Promise<UserResponse> => {
      try {
        // 유효성 검사
        if (!isValidEmail(data.email)) {
          throw new Error('올바른 이메일 형식을 입력해주세요.');
        }
        if (!isValidUsername(data.username)) {
          throw new Error('사용자명은 3-20자의 영문, 숫자, _만 사용 가능합니다.');
        }
        if (!isValidPassword(data.password)) {
          throw new Error('비밀번호는 8자 이상이어야 합니다.');
        }

        const response = await fetchWithTimeout(`${API_URL}/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
          if (response.status === 400) {
            if (error.detail.includes('Email already registered')) {
              throw new Error('이미 사용중인 이메일입니다.');
            } else {
              throw new Error(error.detail || '입력 정보를 확인해주세요.');
            }
          } else if (response.status >= 500) {
            throw new Error('서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
          } else {
            throw new Error(error.detail || '회원가입에 실패했습니다.');
          }
        }

        return response.json();
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('네트워크 오류가 발생했습니다. 연결을 확인해주세요.');
      }
    },
    onError: (error) => {
      console.error('Signup error:', error);
    },
  });
};

export const useUpdateProfile = () => {
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: async (data: UpdateProfileData): Promise<UserResponse> => {
      const token = useAuthStore.getState().token;
      try {
        if (!token) {
          throw new Error('로그인이 필요합니다.');
        }

        const response = await fetchWithTimeout(`${API_URL}/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
          if (response.status === 400) {
            if (error.detail.includes('Username already taken')) {
              throw new Error('이미 사용중인 닉네임입니다.');
            } else {
              throw new Error(error.detail || '입력 정보를 확인해주세요.');
            }
          } else if (response.status === 401) {
            throw new Error('로그인이 만료되었습니다. 다시 로그인해주세요.');
          } else if (response.status >= 500) {
            throw new Error('서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
          } else {
            throw new Error(error.detail || '프로필 업데이트에 실패했습니다.');
          }
        }

        return response.json();
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('네트워크 오류가 발생했습니다. 연결을 확인해주세요.');
      }
    },
    onSuccess: (userData) => {
      setUser({
        id: userData.id,
        email: userData.email,
        username: userData.username,
      });
    },
    onError: (error) => {
      console.error('Update profile error:', error);
    },
  });
};

// 현재 사용자 정보 가져오기
export const useCurrentUser = () => {
  const { token } = useAuthStore();
  
  return useQuery({
    queryKey: ['currentUser', token], // queryKey에 token을 넣어 토큰 변경 시 재조회
    queryFn: async (): Promise<UserResponse> => {
      const currentToken = useAuthStore.getState().token;
      if (!currentToken) {
        throw new Error('로그인이 필요합니다.');
      }

      const response = await fetchWithTimeout(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        if (response.status === 401) {
          throw new Error('로그인이 만료되었습니다. 다시 로그인해주세요.');
        } else {
          throw new Error(error.detail || '사용자 정보를 가져올 수 없습니다.');
        }
      }

      return response.json();
    },
    enabled: !!token,
  });
};