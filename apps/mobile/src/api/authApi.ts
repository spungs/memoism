/**
 * Authentication API hooks using React Query
 */
import { useMutation } from '@tanstack/react-query';

const API_URL = 'http://localhost:8000';

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
    mutationFn: async (data: SignupRequest): Promise<UserResponse> => {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Signup failed');
      }

      return response.json();
    },
  });
};

export const useLogin = () => {
  return useMutation({
    mutationFn: async (data: LoginRequest): Promise<LoginResponse> => {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      return response.json();
    },
  });
};
