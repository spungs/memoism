"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_TIME_ZONE, deviceTimeZone, todayKeyInZone } from "./tz";

// 시간대는 앱이 켜져 있는 동안 바뀔 수 있지만(비행 후 복귀) 구독할 이벤트가 없다.
// 다음 렌더에서 새 값을 읽으면 충분하다.
const noopSubscribe = () => () => {};

/**
 * 기기 시간대. 클라이언트 컴포넌트가 **렌더 중에** 쓸 때 이 훅을 쓴다.
 *
 * 서버 렌더와 첫 하이드레이션은 서울로 맞추고 그 직후 기기 값으로 바꾼다. 서버(Vercel,
 * UTC)에서 기기 시간대를 직접 읽으면 서버 HTML과 기기 첫 렌더가 달라 하이드레이션
 * 불일치가 난다. 이벤트 핸들러 안에서는 `deviceTimeZone()`을 바로 써도 된다.
 */
export function useDeviceTimeZone(): string {
  return useSyncExternalStore(noopSubscribe, deviceTimeZone, () => DEFAULT_TIME_ZONE);
}

/** 기기 기준 오늘 "YYYY-MM-DD" (렌더용). */
export function useDeviceTodayKey(): string {
  return todayKeyInZone(useDeviceTimeZone());
}
