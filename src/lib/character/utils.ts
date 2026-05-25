import type { SubscriptionStatus } from "@prisma/client";

// 앱 시그니처 캐릭터 이름. 개별 이름 저장/편집 폐기 → 전역 고정.
export const CHARACTER_NAME = "메이";

// 사진 첨부 상한 — 무료/체험/만료 5장, 유료(ACTIVE) 10장.
export const MAX_IMAGES_DEFAULT = 5;
export const MAX_IMAGES_ACTIVE = 10;

export function maxImagesForStatus(status: SubscriptionStatus): number {
  return status === "ACTIVE" ? MAX_IMAGES_ACTIVE : MAX_IMAGES_DEFAULT;
}
