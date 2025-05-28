import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform, NativeModules } from 'react-native';

import en from './locales/en.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';

const resources = {
  en: {
    translation: en,
  },
  ko: {
    translation: ko,
  },
  ja: {
    translation: ja,
  },
  zh: {
    translation: zh,
  },
};

// 디바이스 언어 감지
const getDeviceLanguage = () => {
  let locale = 'en'; // 기본값
  
  if (Platform.OS === 'ios') {
    locale = NativeModules.SettingsManager?.settings?.AppleLocale ||
             NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
             'en';
  } else {
    locale = NativeModules.I18nManager?.localeIdentifier || 'en';
  }
  
  // 언어 코드만 추출 (예: ko-KR → ko)
  return locale.split('-')[0].toLowerCase();
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    // Intl API 호환성 문제 해결
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    // pluralResolver 비활성화로 경고 제거
    pluralSeparator: '_',
    contextSeparator: '_',
  });

export default i18n; 