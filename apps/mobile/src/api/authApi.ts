/**
 * Authentication API hooks using React Query
 */
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../utils/apiClient';

interface SignupRequest {
  email: string;
  username: string;
  password: string;
}

interface UserResponse {
  id: string;
  email: string;
  username: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  user: UserResponse;
}

export const useSignup = () => {
  return useMutation({
    mutationFn: (data: SignupRequest) =>
      apiFetch<UserResponse>('/auth/signup', { method: 'POST', body: data }),
  });
};

export const useLogin = () => {
  return useMutation({
    mutationFn: (data: LoginRequest) =>
      apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: data }),
  });
};
