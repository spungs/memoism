/**
 * API configuration with environment support
 */
import Constants from 'expo-constants';

/**
 * Get API URL from environment configuration.
 * Falls back to localhost for development.
 */
export const getApiUrl = (): string => {
  // Try to get from expo-constants first (for production builds)
  const apiUrl = Constants.expoConfig?.extra?.apiUrl;

  if (apiUrl) {
    return apiUrl;
  }

  // Fallback for development
  return 'http://localhost:8000';
};

export const API_URL = getApiUrl();

/**
 * Get current environment
 */
export const getEnvironment = (): string => {
  return Constants.expoConfig?.extra?.environment || 'development';
};

export const ENVIRONMENT = getEnvironment();
