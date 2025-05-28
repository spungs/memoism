import { Platform } from 'react-native';

// 개발 환경에서 플랫폼별 API URL 설정
export const getApiUrl = (): string => {
  if (__DEV__) {
    // 개발 환경 - 실제 IP 주소 사용 (임시)
    const url = Platform.OS === 'ios' 
      ? 'http://172.20.10.2:8000'
      : 'http://10.0.2.2:8000';
    
    console.log('🌐 API URL configured:', url, 'for platform:', Platform.OS);
    return url;
  } else {
    // 프로덕션 환경 - 실제 서버 URL로 변경 필요
    return 'https://your-production-api.com';
  }
};

export const API_URL = getApiUrl(); 