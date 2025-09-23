import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import AuthLoginScreen from './screens/AuthLoginScreen';
import AuthSignupScreen from './screens/AuthSignupScreen';
import DiaryListScreen from './screens/DiaryListScreen';
import DiaryDetailScreen from './screens/DiaryDetailScreen';
import DiaryEditScreen from './screens/DiaryEditScreen';
import SettingsScreen from './screens/SettingsScreen';
import MapScreen from './screens/MapScreen'; // MapScreen import 추가
import { navigationRef, type RootStackParamList } from './utils/navigationRef';
import './i18n'; // i18n 초기화

import { GestureHandlerRootView } from 'react-native-gesture-handler';

// 확장된 RootStackParamList - MainTabs 추가
type ExtendedRootStackParamList = RootStackParamList & {
  MainTabs: undefined;
};

// Stack과 Tab에 타입 적용
const Stack = createNativeStackNavigator<ExtendedRootStackParamList>();
const Tab = createBottomTabNavigator();
const queryClient = new QueryClient();

// 메인 탭 네비게이터
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="DiaryListTab"
        component={DiaryListScreen}
        options={{
          headerShown: false,
          title: '홈',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>🏠</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function Navigation() {
  const token = useAuthStore((state) => state.token);

  return (
    <Stack.Navigator>
      {!token ? (
        // 인증되지 않은 사용자
        <>
          <Stack.Screen
            name="AuthLogin"
            component={AuthLoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AuthSignup"
            component={AuthSignupScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        // 인증된 사용자
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="DiaryDetail"
            component={DiaryDetailScreen}
            options={{
              headerShown: false, // 이 화면은 자체 헤더를 사용합니다.
            }}
          />
          <Stack.Screen
            name="DiaryEdit"
            component={DiaryEditScreen}
            options={{
              headerShown: false, // 이 화면은 자체 헤더를 사용합니다.
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Map"
            component={MapScreen}
            options={{
              headerShown: true,
              title: '사진 위치',
              headerBackTitleVisible: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer ref={navigationRef}>
          <Navigation />
        </NavigationContainer>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
