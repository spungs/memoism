/**
 * Authentication 관련 타입 정의
 */

import { User } from './user';

export interface SignupRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}
