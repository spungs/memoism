---
description: 다국어 번역 추가/수정 (EN/KO/JA/ZH)
---

다국어 번역을 추가하거나 수정합니다.

## 번역 파일 위치
- 영어: `apps/mobile/locales/en.json`
- 한국어: `apps/mobile/locales/ko.json`
- 일본어: `apps/mobile/locales/ja.json`
- 중국어: `apps/mobile/locales/zh.json`

## 번역 추가 프로세스

1. **키 네이밍 규칙**:
   ```
   screen.component.text
   예: "login.button.submit" → "로그인"
   ```

2. **4개 언어 모두에 추가**:
   ```json
   // ko.json
   {
     "login": {
       "button": {
         "submit": "로그인"
       }
     }
   }

   // en.json
   {
     "login": {
       "button": {
         "submit": "Login"
       }
     }
   }
   ```

3. **컴포넌트에서 사용**:
   ```typescript
   import { useTranslation } from 'react-i18next'

   const { t } = useTranslation()
   <Text>{t('login.button.submit')}</Text>
   ```

## 현재 지원 언어
- ✅ 영어 (en) - English
- ✅ 한국어 (ko) - 한국어 (기본값)
- ✅ 일본어 (ja) - 日本語
- ✅ 중국어 (zh) - 简体中文

## 자동 언어 감지
디바이스 설정에 따라 자동으로 언어를 선택합니다.
(`apps/mobile/i18n.ts:11-13`)

어떤 텍스트를 번역하거나 추가할까요?
