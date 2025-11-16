/**
 * Authentication API hooks using React Query
 */
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../utils/apiClient';
import { User } from '../types/user';
import { SignupRequest, LoginRequest, LoginResponse } from '../types/auth';

export const useSignup = () => {
  return useMutation({
    mutationFn: (data: SignupRequest) =>
      apiFetch<User>('/auth/signup', { method: 'POST', body: data }),
  });
};

export const useLogin = () => {
  return useMutation({
    mutationFn: (data: LoginRequest) =>
      apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: data }),
  });
};
