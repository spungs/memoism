import { createRef } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';

// Stack Param List 정의
export type RootStackParamList = {
  AuthLogin: undefined;
  AuthSignup: undefined;
  MainTabs: undefined;
  DiaryList: undefined;
  DiaryDetail: { id: string };
  DiaryEdit: { id?: string };
  
  Settings: undefined;
};

// 전역 네비게이션 ref 생성
export const navigationRef = createRef<NavigationContainerRef<RootStackParamList>>(); 