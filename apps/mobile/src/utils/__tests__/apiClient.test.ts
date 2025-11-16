import { apiFetch } from '../apiClient';
import { API_URL } from '../../config/api';

// Mock global fetch
global.fetch = jest.fn();

describe('apiClient', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('apiFetch', () => {
    it('should make GET request successfully', async () => {
      const mockData = { id: '1', name: 'Test' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await apiFetch('/test');

      expect(global.fetch).toHaveBeenCalledWith(`${API_URL}/test`, {
        method: 'GET',
        headers: {},
      });
      expect(result).toEqual(mockData);
    });

    it('should make POST request with body', async () => {
      const mockData = { id: '1' };
      const requestBody = { name: 'Test' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await apiFetch('/test', {
        method: 'POST',
        body: requestBody,
      });

      expect(global.fetch).toHaveBeenCalledWith(`${API_URL}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      expect(result).toEqual(mockData);
    });

    it('should include Authorization header when token is provided', async () => {
      const mockData = { id: '1' };
      const token = 'test-token';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      await apiFetch('/test', { token });

      expect(global.fetch).toHaveBeenCalledWith(`${API_URL}/test`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    });

    it('should include both Content-Type and Authorization headers', async () => {
      const mockData = { id: '1' };
      const token = 'test-token';
      const requestBody = { name: 'Test' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      await apiFetch('/test', {
        method: 'POST',
        token,
        body: requestBody,
      });

      expect(global.fetch).toHaveBeenCalledWith(`${API_URL}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });
    });

    it('should throw error when response is not ok with detail', async () => {
      const errorDetail = 'Invalid credentials';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: errorDetail }),
      });

      await expect(apiFetch('/test')).rejects.toThrow(errorDetail);
    });

    it('should throw error when response is not ok without detail', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      await expect(apiFetch('/test')).rejects.toThrow(
        'API request failed with status 500'
      );
    });

    it('should handle JSON parse error in error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(apiFetch('/test')).rejects.toThrow(
        'API request failed with status 500'
      );
    });
  });
});
