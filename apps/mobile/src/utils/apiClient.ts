/**
 * API 클라이언트 유틸리티
 *
 * 공통 fetch 로직을 캡슐화하여 API 호출 코드의 중복을 제거합니다.
 * 모든 API 요청은 이 유틸리티를 통해 수행됩니다.
 */
import { API_URL } from '../config/api';

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  token?: string;
  body?: any;
}

/**
 * API 요청을 수행하는 공통 함수
 *
 * @param endpoint - API 엔드포인트 경로 (예: '/auth/login', '/diary')
 * @param options - 요청 옵션 (method, token, body)
 * @returns API 응답 데이터
 * @throws API 에러 시 Error 객체
 *
 * @example
 * // GET 요청 (인증 필요)
 * const diaries = await apiFetch<DiaryResponse[]>('/diary', { token });
 *
 * @example
 * // POST 요청 (인증 불필요)
 * const user = await apiFetch<UserResponse>('/auth/signup', {
 *   method: 'POST',
 *   body: { email, username, password }
 * });
 *
 * @example
 * // POST 요청 (인증 필요)
 * const diary = await apiFetch<DiaryResponse>('/diary', {
 *   method: 'POST',
 *   token,
 *   body: { title, content }
 * });
 */
export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = 'GET', token, body } = options;

  const headers: Record<string, string> = {};

  // Body가 있는 경우 Content-Type 설정
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  // 토큰이 있는 경우 Authorization 헤더 설정
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    // 에러 응답에서 detail 필드 추출 시도
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `API request failed with status ${response.status}`
    );
  }

  return response.json();
}
