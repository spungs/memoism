/**
 * Test 3.1: authStore initial state
 *
 * Given: authStore is imported for the first time
 * When: The store is accessed
 * Then:
 *   - token should be null
 *   - user should be null
 *   - isAuthenticated should be false
 */
import { renderHook, act } from '@testing-library/react-native';
import { useAuthStore } from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.clearAuth();
    });
  });

  describe('test_auth_store_initial_state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  /**
   * Test 3.2: authStore set token
   *
   * Given: authStore is in initial state
   * When: setToken is called with a valid JWT token
   * Then:
   *   - token should be set to the provided value
   *   - isAuthenticated should be true
   */
  describe('test_auth_store_set_token', () => {
    it('should set token and update isAuthenticated', () => {
      const { result } = renderHook(() => useAuthStore());
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';

      act(() => {
        result.current.setToken(testToken);
      });

      expect(result.current.token).toBe(testToken);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });
});
