/**
 * Authentication store using Zustand
 */
import { create } from 'zustand';
import { User } from '../types/user';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  setToken: (token: string) =>
    set({ token, isAuthenticated: true }),
  setUser: (user: User) => set({ user }),
  clearAuth: () =>
    set({ token: null, user: null, isAuthenticated: false }),
}));
