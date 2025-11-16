/**
 * React Navigation 타입 정의
 */

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RouteProp } from '@react-navigation/native';

// Root Stack
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

// Auth Stack
export type AuthStackParamList = {
  AuthLogin: undefined;
  AuthSignup: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  DiaryList: undefined;
  Chat: undefined;
  Map: undefined;
};

// Diary Stack
export type DiaryStackParamList = {
  DiaryList: undefined;
  DiaryDetail: { diaryId: string };
  DiaryEdit: { diaryId: string };
};

// Screen Navigation Props
export type LoginScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'AuthLogin'
>;

export type SignupScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'AuthSignup'
>;

export type DiaryListScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  'DiaryList'
>;

export type ChatScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  'Chat'
>;

export type MapScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  'Map'
>;

export type DiaryDetailScreenNavigationProp = NativeStackNavigationProp<
  DiaryStackParamList,
  'DiaryDetail'
>;

export type DiaryDetailScreenRouteProp = RouteProp<
  DiaryStackParamList,
  'DiaryDetail'
>;

export type DiaryEditScreenNavigationProp = NativeStackNavigationProp<
  DiaryStackParamList,
  'DiaryEdit'
>;

export type DiaryEditScreenRouteProp = RouteProp<
  DiaryStackParamList,
  'DiaryEdit'
>;
